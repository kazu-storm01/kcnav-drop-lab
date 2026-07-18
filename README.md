# KCNav Drop Lab

KCNavのコピーテキストからドロップ表を登録し、艦これの掘りをシミュレーション・記録するブラウザアプリです。

## 使い方

1. `outputs/kcnav-drop-lab.html` をブラウザで開く
2. 「設定・記録」から「KCNavから海域を登録」を開く
3. 海域・難易度・マスを入力し、KCNavのドロップ表を貼り付ける
4. 目標艦と周回数を選んでシミュレーションする

初期プリセットとして、E3-4甲ZマスのS勝利190件を収録しています。個人の実戦ログは収録していません。

## 主な機能

- 複数海域のプリセット管理
- S・Aなど戦闘評価別のドロップ抽選
- 目標艦の達成確率と期待値
- 50%・90%達成に必要な周回数の目安
- 実戦ログの実測率とKCNav率の比較分析
- 通常・レア・最優先の演出切り替え
- 収録艦のカード画像をドロップ時に自動表示
- 実戦ログの端末内保存
- JSONによるバックアップと復元

## ファイル

- `outputs/kcnav-drop-lab.html` — 配布・実行用の単体HTML
- `.codex/visualizations/2026/07/16/kcnav-drop-lab/kcnav-drop-lab.html` — 編集用ソース

データはブラウザのローカルストレージへ保存されます。艦娘画像は外部サイトから表示するため、画像表示にはインターネット接続が必要です。画像そのものはこのリポジトリに収録していません。

実戦ログは利用者自身のブラウザ内にのみ保存され、リポジトリやGitHub Pagesへ送信されません。

## GitHub Pagesで公開する

`.github/workflows/deploy-pages.yml` が、pull requestと`main`へのpush時にCIを実行します。

CIでは次を検査します。

- 個人メール、秒単位の実戦日時、ローカルパス、秘密情報の混入
- コミット作者メールがGitHubの`noreply`であること
- 初期実戦ログが空であること
- 編集用ソースと配布用HTMLの整合性
- HTMLの基本構造とJavaScript構文
- Playwrightによる実ブラウザ起動、初期ログ0件、1周シミュレーション

すべて成功した`main`のコミットだけが、`outputs/kcnav-drop-lab.html`を
`index.html`としてGitHub Pagesへ自動公開されます。

GitHub上のマージ方式はRebase mergeのみを使用します。GitHubが新しい作者情報を
生成するSquash mergeは、個人メールの再混入を避けるため無効化しています。

初回のみ、GitHub上で次の設定が必要です。

1. リポジトリの `Settings` を開く
2. `Pages` を開く
3. `Build and deployment` の `Source` を `GitHub Actions` にする
4. `main` ブランチをpushするか、`Actions` の `Deploy GitHub Pages` から手動実行する

公開URLは通常、次の形式です。

```text
https://<GitHubユーザー名>.github.io/<リポジトリ名>/
```

非公開リポジトリからGitHub Pagesを公開するには、対応するGitHubプランが必要です。
リポジトリが非公開でも、Pagesサイトは設定によって一般公開されるため、
公開用HTMLに秘密情報を含めないでください。
