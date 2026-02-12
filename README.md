# 生成AI日記アプリ × AWS高可用性インフラ構築

生成AI日記アプリを支える3層VPCと自動復旧設計
Terraform とコンテナ技術を用いたインフラ設計プロジェクト

## 概要

本プロジェクトは、AWS 上に構築した 生成AI日記アプリのクラウドネイティブインフラ設計 をまとめたものです。

インフラは以下の流れで進化しています：

- Golden AMI ベースの不変インフラ

- Docker によるコンテナ化

- 自己修復アーキテクチャ

- 認証・セッション管理を含むエンタープライズ構成（予定）

- 本リポジトリでは主に インフラ設計・自動化・スケーラビリティ戦略 に焦点を当てています。

## v1.0 — Foundation
### 不変インフラと自己修復アーキテクチャ

**目的：** 再現可能で耐障害性の高いインフラ基盤の構築

#### アーキテクチャ設計

- 3層アーキテクチャ構成

- Public Subnet：ALB

- Private Subnet：App / DB

- ネットワーク分離によるセキュリティ強化

#### データ永続化

- ローカルDBから Amazon RDS（PostgreSQL） へ移行

- インスタンス削除後もデータ保持が可能

##### Golden AMI 方式

- 必要パッケージを事前インストールしたカスタムAMIを作成

- デプロイ時間短縮と環境の一貫性を確保

#### Self-healing 構成

- Auto Scaling Group + ALB

- 異常検知時にインスタンスを自動置換

#### Infrastructure as Code

- Terraform によりインフラをコード管理

## v1.5 — Modernization
### コンテナ化とデプロイ自動化

**目的：** AMI管理コスト削減とデプロイ柔軟性の向上

#### Docker 導入

- アプリケーションをコンテナ化

- 環境再現性を向上

- Golden AMI 依存を削減

#### Amazon ECR

- Docker イメージをプライベートレジストリで管理

- イメージの一元管理を実現

#### NAT Gateway

- Private Subnet から安全に

  - Docker イメージ取得

  - OSアップデートを実行可能に

#### 起動時デプロイ自動化

- EC2 User Data により起動時に：

  - 最新コンテナを pull

  - コンテナを自動起動

- Terraform ワークフローと連携

## v2.0 — Enterprise（予定）
### 認証基盤とセッション管理

**※現在設計中のロードマップ**

#### Amazon Cognito

- メール認証によるユーザー登録

- Lambda による自動承認（Auto-confirm）

#### Redis セッション管理

- スケール時・再デプロイ時もセッションを維持

- ユーザーの強制ログアウトを防止

#### Stateful アーキテクチャへの進化

- ステートレス構成から

- 状態管理とスケーラビリティを両立する構成へ

## 設計思想

- Replace Instead of Repair

- Immutable Infrastructure

- Self-Healing Architecture

- Infrastructure as Code

- Network Isolation First

- Controlled Stateful Design

## Tech Stack
### Infrastructure

- Terraform
- AWS VPC
- Application Load Balancer
- Auto Scaling Group
- Amazon RDS
- NAT Gateway

### Container

- Docker
- Amazon ECR

### Security / Identity

- IAM Roles
- Amazon Cognito（予定）

### State Management

- Redis（Docker）(予定）
