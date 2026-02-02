# 需求文档

## 简介

本文档定义了一个基于 Minecraft 1.20.1 Forge + KubeJS 6 的商店系统。该系统允许玩家通过 GUI 界面使用多种货币购买商品，支持热加载配置，并记录所有交易日志。

## 术语表

- **商店系统 (Shop_System)**: 整个商店功能的总称，包括 GUI、配置管理、交易逻辑等
- **系统商店 (System_Shop)**: 具有无限供应的商店，由服务器管理
- **商店 GUI (Shop_GUI)**: 基于箱子界面的图形用户界面，用于展示和购买商品
- **商店物品 (Shop_Item)**: 触发打开商店 GUI 的特殊 NBT 物品
- **商品 (Product)**: 可在商店中购买的物品
- **货币 (Currency)**: 用于购买商品的物品（如泥土、绿宝石等）
- **货币价值 (Currency_Value)**: 每种货币相对于基础单位的价值
- **交易 (Transaction)**: 玩家使用货币购买商品的行为
- **热加载 (Hot_Reload)**: 无需重启服务器即可重新加载配置和脚本的功能
- **配置文件 (Config_File)**: 存储商品和货币信息的 JSON 文件
- **交易日志 (Transaction_Log)**: 记录所有交易详情的日志文件
- **玩家背包 (Player_Inventory)**: 玩家的物品栏

## 需求

### 需求 1: 热加载支持

**用户故事**: 作为服务器管理员，我希望修改配置后无需重启服务器即可生效，以便快速调整商店设置而不影响玩家游戏体验。

#### 验收标准

1. WHEN 管理员修改配置文件 THEN THE 商店系统 SHALL 在下次访问时加载最新配置
2. WHEN 管理员执行重载命令 THEN THE 商店系统 SHALL 立即重新加载所有配置文件
3. WHEN 配置文件格式错误 THEN THE 商店系统 SHALL 记录错误信息并保持使用上一次有效配置
4. WHEN 脚本文件被修改 THEN THE KubeJS SHALL 通过 `/kubejs reload server_scripts` 命令重新加载脚本

### 需求 2: 商店物品交互

**用户故事**: 作为玩家，我希望通过右键点击特殊物品打开商店界面，以便方便地访问商店功能。

#### 验收标准

1. WHEN 玩家右键点击带有特定 NBT 标签的物品 THEN THE 商店系统 SHALL 打开商店 GUI
2. THE 商店物品 SHALL 包含 NBT 标签 `{shop_item: true}` 用于识别
3. WHEN 玩家右键点击普通物品 THEN THE 商店系统 SHALL 不响应该操作
4. THE 商店物品 SHALL 可通过配置文件定义其显示名称和描述

### 需求 3: 商店 GUI 界面

**用户故事**: 作为玩家，我希望通过直观的箱子界面浏览和购买商品，以便轻松完成交易。

#### 验收标准

1. WHEN 商店 GUI 打开 THEN THE 商店系统 SHALL 显示一个箱子界面，其中包含所有可购买的商品
2. WHEN 玩家点击商品图标 THEN THE 商店系统 SHALL 尝试执行购买交易
3. THE 商店 GUI SHALL 为每个商品显示物品图标、名称、价格和货币类型
4. WHEN 商品列表超过一页 THEN THE 商店 GUI SHALL 提供翻页按钮
5. THE 商店 GUI SHALL 包含关闭按钮或允许玩家按 ESC 键关闭
6. WHEN 玩家背包已满 THEN THE 商店系统 SHALL 阻止购买并提示玩家

### 需求 4: JSON 配置管理

**用户故事**: 作为服务器管理员，我希望通过 JSON 文件管理商品和货币，以便灵活配置商店内容。

#### 验收标准

1. THE 商店系统 SHALL 从独立的 JSON 配置文件读取商品列表
2. THE 商店系统 SHALL 从独立的 JSON 配置文件读取货币定义
3. WHEN 配置文件不存在 THEN THE 商店系统 SHALL 创建默认配置文件
4. THE 配置文件 SHALL 包含商品的物品 ID、数量、价格、货币类型和显示信息
5. THE 配置文件 SHALL 包含货币的物品 ID、显示名称和相对价值
6. THE 配置文件 SHALL 使用标准 JSON 格式以便于编辑

### 需求 5: 多货币系统

**用户故事**: 作为服务器管理员，我希望支持多种货币，每种货币有不同价值，以便创建更丰富的经济系统。

#### 验收标准

1. THE 商店系统 SHALL 支持配置多种货币类型
2. WHEN 定义货币 THEN THE 商店系统 SHALL 为每种货币分配一个相对价值
3. WHEN 计算商品价格 THEN THE 商店系统 SHALL 根据货币价值计算所需数量
4. THE 商店系统 SHALL NOT 支持货币之间的直接兑换
5. WHEN 玩家购买商品 THEN THE 商店系统 SHALL 只接受该商品指定的货币类型
6. THE 商店系统 SHALL 支持货币的 NBT 标签匹配（可选）

### 需求 6: 交易验证与执行

**用户故事**: 作为玩家，我希望系统准确验证我的货币并完成交易，以便公平地获得商品。

#### 验收标准

1. WHEN 玩家尝试购买商品 THEN THE 商店系统 SHALL 检查玩家背包中是否有足够的指定货币
2. WHEN 玩家货币不足 THEN THE 商店系统 SHALL 拒绝交易并提示玩家
3. WHEN 玩家货币充足 THEN THE 商店系统 SHALL 扣除相应数量的货币
4. WHEN 货币扣除成功 THEN THE 商店系统 SHALL 将商品添加到玩家背包
5. WHEN 交易完成 THEN THE 商店系统 SHALL 向玩家发送确认消息
6. WHEN 交易过程中发生错误 THEN THE 商店系统 SHALL 回滚所有更改并通知玩家

### 需求 7: 交易日志记录

**用户故事**: 作为服务器管理员，我希望所有交易都被记录到日志文件，以便审计和分析经济活动。

#### 验收标准

1. WHEN 交易完成 THEN THE 商店系统 SHALL 将交易详情写入独立的日志文件
2. THE 交易日志 SHALL 包含时间戳、玩家名称、商品信息、货币类型和数量
3. THE 交易日志 SHALL 使用易于解析的格式（如 JSON 或结构化文本）
4. WHEN 交易失败 THEN THE 商店系统 SHALL 记录失败原因
5. THE 交易日志文件 SHALL 按日期或大小自动分割以避免文件过大
6. THE 商店系统 SHALL 确保日志写入不影响游戏性能

### 需求 8: 系统商店特性

**用户故事**: 作为服务器管理员，我希望商店具有无限供应，以便玩家随时可以购买所需物品。

#### 验收标准

1. THE 系统商店 SHALL 提供无限数量的所有配置商品
2. WHEN 玩家购买商品 THEN THE 系统商店 SHALL 不减少商品库存
3. THE 系统商店 SHALL 不接受玩家出售物品（仅支持购买）
4. THE 商店系统 SHALL 为未来扩展玩家间交易预留架构空间

### 需求 9: 错误处理与用户反馈

**用户故事**: 作为玩家，我希望在操作失败时收到清晰的提示信息，以便了解问题所在。

#### 验收标准

1. WHEN 交易失败 THEN THE 商店系统 SHALL 向玩家发送清晰的错误消息
2. WHEN 配置文件加载失败 THEN THE 商店系统 SHALL 在服务器日志中记录详细错误
3. WHEN 玩家背包已满 THEN THE 商店系统 SHALL 提示玩家清理背包空间
4. WHEN 货币不足 THEN THE 商店系统 SHALL 显示所需货币数量和当前拥有数量
5. THE 商店系统 SHALL 使用玩家易于理解的语言显示所有消息
6. THE 商店系统 SHALL 支持通过配置文件自定义消息文本

### 需求 10: KubeJS 6 集成

**用户故事**: 作为开发者，我希望系统充分利用 KubeJS 6 的特性，以便实现高效且可维护的代码。

#### 验收标准

1. THE 商店系统 SHALL 使用 KubeJS 6 的事件系统监听玩家交互
2. THE 商店系统 SHALL 使用 KubeJS 的 `ItemEvents.rightClicked` 事件检测商店物品使用
3. THE 商店系统 SHALL 使用 KubeJS 的库函数进行物品和背包操作
4. THE 商店系统 SHALL 将所有脚本文件放置在 `server_scripts` 目录
5. THE 商店系统 SHALL 将所有配置文件放置在 `kubejs/config` 或自定义配置目录
6. THE 商店系统 SHALL 遵循 KubeJS 6 的最佳实践和代码规范
