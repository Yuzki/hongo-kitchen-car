# キッチンカー出店カレンダー

東京大学本郷キャンパスのキッチンカー出店情報を表示するカレンダーアプリケーションです。

## Webページ

[キッチンカー出店カレンダーページ](https://yuzki.github.io/hongo-kitchen-car/)


## セットアップ

### 1. リポジトリのクローン

```bash
git clone https://github.com/Yuzki/kitchen-car.git
cd kitchen-car
```

### 2. Python の依存関係をインストール

```bash
uv sync
```

### 3. データの取得

```bash
# マーケット情報を取得
uv run script/get_data.py
```

### 4. ローカルでの確認

```bash
# docsフォルダでローカルサーバーを起動
cd docs
python -m http.server 8000

# ブラウザで http://localhost:8000 にアクセス
```

## データ更新

- GitHub Actionsにより毎日自動的にデータが更新されます
- 手動でデータを更新する場合は、Actions タブから "Deploy to GitHub Pages" ワークフローを実行してください
