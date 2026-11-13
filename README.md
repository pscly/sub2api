# sub2api

Sub2API 兼容网关的命令行小工具：**查健康、列模型、看余额**。

> **非官方。** 这个包不是 [Sub2API 服务端项目](https://github.com/Wei-Shaw/sub2api) 本身，也不含服务端代码。它只是一个访问网关公开接口（`/health`、`/v1/models`、`/v1/sub2api/billing`）的客户端，由 [pscly](https://github.com/pscly) 维护，配套 [dsh-sub2api](https://github.com/pscly/dsh-sub2api) 插件使用。

## 安装

```sh
npx sub2api --help
# 或
npm i -g sub2api
```

零依赖，Node 18 以上。

## 用法

```sh
# 网关是否活着
sub2api health --base https://sub.pscly.cc

# 这个 Key 能看到哪些模型
sub2api models --base https://sub.pscly.cc --key sk-xxx

# 余额与倍率
sub2api balance --base https://sub.pscly.cc --key sk-xxx

# 脚本里用
sub2api models --json | jq '.data[].id'
```

地址和 Key 也可以走环境变量，省得每次写：

```sh
export SUB2API_BASE=https://sub.pscly.cc
export SUB2API_KEY=sk-xxx
sub2api models
```

## 命令

| 命令 | 作用 |
|---|---|
| `sub2api health` | 调 `/health`，确认网关可达 |
| `sub2api models` | 调 `/v1/models`，列出 Key 可见的模型 |
| `sub2api balance` | 调 `/v1/sub2api/billing`，显示余额与倍率 |
| `sub2api dsh` | 打印在 DeepSeek Harness 里接入的步骤 |

参数：`--base`、`--key`、`--json`。

## 常见错误

| 输出 | 含义 |
|---|---|
| `缺少 API Key` | 没传 `--key`，也没设 `SUB2API_KEY` |
| `Insufficient account balance（INSUFFICIENT_BALANCE）` | 账户余额为 0，网关会拒绝列模型，充值后恢复 |
| `API key is not assigned to a group` | 这个 Key 没绑分组，去后台重新建一个 |

## 配套插件

把网关接进 DeepSeek Harness：

```sh
dsh plugin add dsh-sub2api
```

装完打开 **设置 → Sub2API** 填邮箱密码即可，插件会自动建密钥、同步模型、显示余额和充值入口。

## 许可证

MIT
