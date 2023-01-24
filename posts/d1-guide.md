---
title: 如何使用 CloudFlare D1 ?
date: 2023-01-20
author: 甜力怕
avatar: https://yeeee.ml/img/member-xiaozhu2007.png
---

CloudFlare 在 2017 年推出了 Cloudflare Workers，让开发人员能够在 CloudFlare 的网络上进行计算。
2022 年 6 月， CloudFlare 宣布推出 D1，这是第一个无服务器 SQL 数据库。

---

D1 基于 SQLite 构建。SQLite 不仅是世界上最普遍的数据库，每天被数十亿台设备使用，它还是第一个无服务器数据库。惊讶吗？SQLite 太超前了，在该术语获得云服务的内涵之前，它称自己为“无服务器”，最初的字面意思是“不涉及服务器”。

借助目前处于 **Alpha** 阶段的 D1，您可以真正实现全栈并构建丰富的应用程序，包括电子商务网站、会计软件、SaaS 解决方案、CRM 等。

由于 Workers 本身在服务器和客户端之间运行，并且受到为客户端构建的技术的启发，SQLite 似乎非常适合作为 CloudFlare 进入数据库领域的入口。

## 如何开始使用 D1 ？

本指南将指导您使用 D1 设置和部署您的第一个数据库。本指南**假设您已经拥有 Cloudflare 帐户**。

![D1 数据库面板](https://pic3.zhimg.com/80/v2-60f3e03049f6cb16497ff56afd38d62e_720w.webp)

### 1. 安装并验证 `Wrangler`

您将使用[Wrangler](https://developers.cloudflare.com/workers/wrangler/install-and-update/)来访问 D1，这是一种用于构建 Cloudflare Workers 的命令行(CLI)工具。

要安装 `Wrangler`，请确保您安装了 npm 和 Node.js。

通过 npm 安装 `Wrangler`：

```bash npm
npm install -g wrangler
```

或使用 yarn

```bash yarn
yarn global add wrangler
```

安装 `Wrangler` 后，如果您未经身份验证，您将被定向到一个网页，要求您登录 `Cloudflare` 仪表板。登录后，系统会询问您 `Wrangler` 是否可以更改您的 `Cloudflare` 帐户。向下滚动并选择**允许**以继续。

### 2. 创建你的 Worker

您将使用 Worker 访问您的 D1 数据库。通过运行来启动一个新的 Worker 项目 `my-project`：

```bash
wrangler init my-project -y
```

这将创建一个新的 Worker 项目目录 (my-project)。您的新目录将包含一个 `wrangler.toml` 配置文件，这是您的 my-projectWorker 访问 D1 数据库的方式。

> 指示 `-y` 将肯定地回答 Wrangler 的所有初始化问题。这将创建一个 `package.json` 文件，一个 `index.ts` 文件(而不是一个 index.js 文件)，Wrangler 也会在你的项目的根目录下生成一个文件 `tsconfig.json` 。它还将创建一个 fetch 处理程序。

### 3. 创建你的数据库

要创建您的第一个数据库，请转到您的 Worker 项目目录：

```bash
cd my-project
```

然后运行以下命令并为您的数据库命名(请替换`<DATABASE_NAME>`)：

```bash
wrangler d1 create <DATABASE_NAME>
```

这将创建一个新的 D1 数据库 `<DATABASE_NAME>`。

### 4. 将您的 Worker 绑定到您的 D1 数据库

您必须为您的 Worker 创建绑定以连接到您的 D1 数据库。绑定允许您的 Workers 访问 Cloudflare 开发人员平台上的资源，例如 D1。您可以通过更新`wrangler.toml`文件来创建绑定。

要将您的 D1 数据库绑定到您的 Worker，请将以下内容添加到您的`wrangler.toml`文件中：

```toml wrangler.toml
[[ d1_databases ]]
binding = "<BINDING_NAME>"
database_name = "<DATABASE_NAME>"
database_id = "<UUID>"
```

<BINDING_NAME>通过更新值来设置绑定名称。您的绑定在 Worker 中可用 env.<BINDING_NAME>。在第 3 步中运行命令后，您将在终端中找到 database_name 和 database_id 的值。

执行`wrangler d1 create`命令时，会自动安装客户端 API 包（实现 D1 API 和数据库类）。

### 5. 配置您的 D1 数据库

正确配置后，`wrangler.toml`设置您的数据库。您将使用以下示例`schema.sql`文件来配置您的数据库。复制以下代码并将其另存为您在步骤 2 中创建的 Worker 目录中的文件`schema.sql`里：

```sql schema.sql
DROP TABLE IF EXISTS Customers;
CREATE TABLE Customers (CustomerID INT, CompanyName TEXT, ContactName TEXT, PRIMARY KEY (`CustomerID`));
INSERT INTO Customers (CustomerID, CompanyName, ContactName) VALUES (1, 'Alfreds Futterkiste', 'Maria Anders'), (4, 'Around the Horn', 'Thomas Hardy'), (11, 'Bs Beverages', 'Victoria Ashworth'), (13, 'Bs Beverages', 'Random Name');
```

您将配置数据库以首先在本地运行和测试。通过运行引导新的 D1 数据库：

```bash
wrangler d1 execute <DATABASE_NAME> --local --file=./schema.sql
```

然后通过运行以下命令验证您的数据是否在数据库中：

```bash
wrangler d1 execute <DATABASE_NAME> --local --command='SELECT * FROM Customers'
```

### 6. 在您的 Worker 中编写查询

设置数据库后，您将从 Worker 中运行 SQL 查询。

首先，转到您的 Worker 项目并打开 index.ts 文件。该 index.ts 文件是您配置 Worker 与 D1 的交互的地方。将以下代码片段粘贴到您的 index.ts 文件中，并将 env 参数替换<BINDING_NAME>为您在第 4 步中设置的绑定名称：

```ts src/index.ts
// src/index.ts
export interface Env {
  <BINDING_NAME>: D1Database;
}

export default {
  async fetch(request: Request, env: Env) {
    const { pathname } = new URL(request.url);

    if (pathname === "/api/beverages") {
      const { results } = await env.<BINDING_NAME>.prepare(
        "SELECT * FROM Customers WHERE CompanyName = ?"
      )
        .bind("Bs Beverages")
        .all();
      return Response.json(results);
    }

    return new Response(
      "Call /api/beverages to see everyone who works at Bs Beverages"
    );
  },
};
```

配置您的 Worker 后，在本地测试您的项目。

### 7. 部署你的数据库

要将数据库部署到生产环境，您必须首先重复数据库引导步骤。

首先，使用您在第 4 步中创建的文件`schema.sql`来引导您的数据库：

```bash
wrangler d1 execute <DATABASE_NAME> --file=./schema.sql
```

然后通过运行验证数据是否在生产中：

```bash
wrangler d1 execute <DATABASE_NAME> --command='SELECT * FROM Customers'
```

最后，部署您的 Worker 以使您的项目可以在 Internet 上访问。要部署您的 Worker，请运行：

```bash
wrangler publish
```

完成本指南后，您已经创建了一个 D1 数据库、一个用于访问该数据库的 Worker 并部署了您的项目。
