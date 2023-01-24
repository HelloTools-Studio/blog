---
title: 如何使用 D1 来搭建评论服务？
date: 2023-01-23
author: 甜力怕
avatar: https://github.com/xiaozhu2007.png
---

在本教程中，我们将学习如何使用 D1 来搭建一个无服务器评论服务。为此，我们将构建一个新的 D1 数据库，并构建一个允许创建和检索评论的 JSON API。<small>这可能是国内第一篇详细介绍 D1 和具体写法的博文了(小声)</small>

---

Hi，欢迎回来，这篇文章和上一篇是连在一起的，如果你没有阅读[上一篇](d1-guide.md)的话，先去读完！下方是 Table of Contents:
[[toc]]

## 设置你的项目

在此示例中，我们将使用 [Hono][honojs]，一个 Express.js 风格的框架，用于构建我们的 API。要在此项目中使用 Hono，请使用 npm 安装它：

```bash npm
npm install hono
```

接下来，在 `src/index.ts` 中，初始化一个新的 Hono 应用程序：

```ts src/index.ts
import { Hono } from "hono";

const app = new Hono();

app.get("/posts/:slug/comments", async (c) => {
  // Do something and return an HTTP response
  // Optionally, do something with `c.req.param("slug")`
});

app.post("/posts/:slug/comments", async (c) => {
  // Do something and return an HTTP response
  // Optionally, do something with `c.req.param("slug")`
});

export default app;
```

### 创建数据库

我们现在将创建一个 D1 数据库。在 Wrangler 2 中，支持 d1 子命令，它允许我们**直接从命令行**创建和查询 D1 数据库。使用以下命令创建一个新数据库：

```bash
wrangler d1 create d1-example
```

通过在我们的文件 Wrangler 的配置文件中创建绑定，在我们的 Worker 代码中引用我们创建的数据库。`wrangler.toml` 绑定允许我们在代码中使用一个简单的变量名来访问 Cloudflare 资源，例如 D1 数据库、KV 命名空间和 R2 存储桶。在`wrangler.toml`中，设置绑定 DB 并将其连接到`database_name`和`database_id`：

```toml wrangler.toml
[[ d1_databases ]]
binding = "DB" # available in your Worker on `env.DB`
database_name = "d1-example"
database_id = "4e1c28a9-90e4-41da-8b4b-6cf36e5abb29"
```

通过在文件中配置绑定 `wrangler.toml`，我们可以从命令行和 Workers 函数内部与数据库进行交互。

### 与 D1 互动

通过使用以下命令发出直接 SQL 命令与 D1 交互 wrangler d1 execute：

```bash
wrangler d1 execute d1-example --command "SELECT name FROM sqlite_schema WHERE type ='table'"
```

我们还可以传递一个 SQL 文件 - 非常适合在单个命令中进行初始数据格式化。创建 `schemas/schema.sql`，这将为我们的项目创建一个新 comments 表：

```sql schemas/schema.sql
DROP TABLE IF EXISTS comments;
CREATE TABLE IF NOT EXISTS comments (
  id integer PRIMARY KEY AUTOINCREMENT,
  author text NOT NULL,
  body text NOT NULL,
  pathname text NOT NULL
);
CREATE INDEX idx_comments_pathname ON comments (pathname);

-- Optionally, use the below query to create data

INSERT INTO COMMENTS (author, body, pathname) VALUES ("甜力怕", "Great post!", "/hello-world.thml");
```

创建文件后，通过将标志传递给 D1 数据库来执行模式文件--file：

```bash
wrangler d1 execute d1-example --file schemas/schema.sql
```

### 执行 SQL

在前面的步骤中，我们创建了一个 SQL 数据库并用初始数据填充了它。现在，我们将向我们的 Workers 函数添加一个路由，以从该数据库检索数据。根据 `wrangler.toml` 前面步骤中的配置，现在可以通过 DB 绑定访问 D1 数据库。在我们的代码中，使用绑定来准备 SQL 语句并执行它们，例如，检索注释：

```ts
app.get("/posts/:slug/comments", async (c) => {
  const { slug } = c.req.param();
  const { results } = await c.env.DB.prepare(
    `
    select * from comments where pathname = ?
  `
  )
    .bind(slug)
    .all();
  return c.json(results);
});
```

上面的代码使用 D1 绑定上的函数来准备和执行 SQL 语句。

在此函数中，我们接受一个 URL 查询参数`id`并设置一个新的 SQL 语句，我们可以在其中选择所有与我们的查询参数`id`具有匹配值的评论。然后，我们可以将其作为简单的 JSON 响应返回。

## 插入数据

通过完成上一步，您已经建立了对数据的只读访问权限。接下来，您将在`src/index.ts`中定义另一个端点函数，该函数允许通过将数据插入数据库来创建新评论：

```ts
app.post("/posts/:slug/comments", async (c) => {
  const { slug } = c.req.param();
  const { author, body } = await c.req.json();

  if (!author) return c.text("Missing author value for new comment");
  if (!body) return c.text("Missing body value for new comment");

  const { success } = await c.env.DB.prepare(
    `
    insert into comments (author, body, pathname) values (?, ?, ?)
  `
  )
    .bind(author, body, slug)
    .run();

  if (success) {
    c.status(201);
    return c.text("Created");
  } else {
    c.status(500);
    return c.text("Something went wrong");
  }
});
```

## 部署

在您的应用程序准备好部署后，使用 Wrangler 构建您的项目并将其发布到 Cloudflare 网络。

首先运行 wrangler whoami 以确认您已登录到您的 Cloudflare 帐户。如果您未登录，Wrangler 将提示您登录，创建一个 API 密钥，您可以使用该密钥从本地计算机自动发出经过身份验证的请求。

登录后，确认您的`wrangler.toml`文件的配置与下图**类似**。您可以将`name`字段更改为您选择的项目名称：

```toml wrangler.toml
name = "d1-example"
main = "src/index.ts"
compatibility_date = "2023-01-15"

[[ d1_databases ]]
binding = "DB" # available in your Worker on env.DB
database_name = "<YOUR_DATABASE_NAME>"
database_id = "<YOUR_DATABASE_UUID>"
```

现在，运行`wrangler publish`将您的项目发布到 Cloudflare。成功发布后，通过发出**GET**请求以检索相关帖子的评论来测试 API。由于您还没有任何帖子，此响应将为空，但无论如何它仍会向 D1 数据库发出请求，您可以使用它来确认应用程序已正确部署：

```bash
# Note: Your workers.dev deployment URL may be different
$ curl https://d1-example.helloworld.workers.dev/posts/hello-world/comments
[
  {
    "id": 1,
    "author": "甜力怕",
    "body": "Hello from the comments section!",
    "pathname": "/hello-world.html"
  }
]
```

## 使用前端进行测试

此应用程序**只是**一个 API 后端，最好与用于创建和查看评论的前端 UI 一起使用。要使用预构建的前端 UI 测试此后端，请参阅文末。值得注意的是，`loadComments` 和 `submitComment` 函数向该站点的部署版本发出请求，这意味着您可以使用前端并将 URL 替换为本教程中代码库的部署版本，以使用您自己的数据。

请注意，从前端与此 API 交互需要在后端 API 中启用特定的跨源资源共享（或*CORS*）标头。幸运的是，[Hono][honojs] 有一种快速的方法可以为您的应用程序启用此功能。导入`cors`模块并将其作为中间件添加到`src/index.ts`中的 API ：

```ts{5}
import { Hono } from "hono";
import { cors } from "hono/cors";
const app = new Hono();
app.use("/*", cors());
```

现在，当您向`/*`发出请求时，[Hono][honojs] 将自动生成 CORS 标头并将其添加到来自您的 API 的响应中，从而允许前端 UI 与其交互而不会出错。

### 文末福利 - 前端代码

```vue Post.vue
<template>
	<div class="post">
		<h1 v-text="post.title" />
		<p v-text="post.content" />

		<h3>Comments (<span v-text="post.comments ? post.comments.length : 0" />)</h3>

		<form v-on:submit="submitComment">
			<textarea
				required
				placeholder="写下你的留言"
				v-model="comment.body"
				cols="40"
				rows="4"
			/>
			<input required type="text" placeholder="您的名称" v-model="comment.author" />
			<input type="submit" />
		</form>

		<span v-if="!post.comments && loadingComments">加载评论中...</span>

		<div v-if="post.comments">
			<div v-for="comment in post.comments">
				<p v-text="sanitize(comment.body)"></p>
				<p>
					<em>- {{ sanitize(comment.author) }}</em>
				</p>
			</div>
		</div>
	</div>
</template>

<script type="module">
	const posts = {
		'hello-world': {
			title: 'Hello World!',
			content: 'Testing, one two',
			slug: '/hello-world.html',
		},
	};
	export default {
		data() {
			return {
				comment: {
					author: '',
					body: '',
				},
				post: null,
				loadingComments: false,
			};
		},
		mounted() {
			const param = this.$route.params.post;
			if (posts[param]) {
				this.post = posts[param];
				this.loadComments();
			} else {
				throw new Error("无法找到博文");
			}
		},
		methods: {
			async loadComments() {
				this.loadingComments = true;
				const resp = await fetch(
					`https://d1-example.helloworld.workers.dev/posts/${this.post.slug}/comments`
				);
				const comments = await resp.json();
				this.post.comments = comments;
				this.loadingComments = false;
			},
			async submitComment(evt) {
				evt.preventDefault();
				const newComment = {
					body: this.sanitize(this.comment.body),
					author: this.sanitize(this.comment.author),
				};
				const resp = await fetch(
					`https://d1-example.helloworld.workers.dev/posts/${this.post.slug}/comments`,
					{
						method: 'POST',
						body: JSON.stringify(newComment),
					}
				);
				if (resp.status == 201) this.post.comments.push(newComment);
				this.comment.author = '';
				this.comment.body = '';
			},
			sanitize(str) {
        /**
         * 1. g全局匹配，找到所有匹配，而不是在第一个匹配后停止
         * 2. i匹配全部大小写
         * 3. m多行，将开始和结束字符（^和$）视为在多行上工作，而不只是只匹配整个输入字符串的最开
         * 始和最末尾处。
         * 4. s与m相反，单行匹配
         */
				str = str.replace(/[^a-z0-9 \.,_-]/gim, '');
				return str.trim();
			},
		},
	};
</script>
```

[honojs]: 