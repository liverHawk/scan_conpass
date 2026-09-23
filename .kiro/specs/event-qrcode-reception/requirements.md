# 要件定義書: イベント参加用 QRコード受付システム

## イントロダクション

本システムは、イベント会場での参加者受付を効率化するための Webアプリケーションです。フロントエンド（ブラウザ）はカメラから QRコードを読み取り、バックエンドは API パスワード認証で保護されたエンドポイントにデータを送信します。バックエンドは Connpass から参加者情報をスクレイピングで取得し、登録者の確認を行い、その結果を Google スプレッドシートまたは CSV に自動保存します。

システムは複数の受付端末からの同時アクセスに対応し、バックエンド側で Connpass のセッション管理を一元化することで、端末ごとの複雑なセッション管理を排除しています。

## 用語集（Glossary）

- **Reception_Staff**: イベント会場で参加者受付を行う担当者
- **Frontend_Application**: ブラウザ上で動作する QRコード読み取り UI（Vue/React など）
- **Backend_System**: API エンドポイントとビジネスロジックを提供するサーバー（Node.js/Python など）
- **Participant**: イベントに参加する者、Connpass に登録している
- **QR_Code**: 参加者情報（ユーザー名など）を含む二次元バーコード
- **QR_Code_Data**: QRコードから抽出されたテキストデータ（ユーザー名）
- **API_Password**: バックエンド API への認証に使用するパスワード
- **Authorization_Header**: HTTP リクエストのヘッダに含まれる認証情報（Bearer トークン形式）
- **Connpass_Session**: バックエンド起動時に確立される Connpass アカウントのログインセッション
- **Connpass_Event_URL**: Connpass イベントの URL（例：https://www.connpass.com/event/xxxxx/）
- **Participant_List**: Connpass イベントページからスクレイピングで取得された参加者一覧
- **Registration_Record**: 参加者が参加登録されたことを示す記録（タイムスタンプ、参加者識別子、イベント URL を含む）
- **Registration_Status**: 参加登録の状態（SUCCESS、FAILED など）
- **Error_Code**: エラー状況を識別するための一意の値（例：INVALID_PASSWORD, PARTICIPANT_NOT_FOUND など）
- **Storage_Destination**: 登録情報を保存する先（Google スプレッドシートまたは CSV ファイル）
- **Audit_Log**: リクエスト・レスポンス・エラーをログに記録したもの

## 要件

### 要件 1: QRコード読み取り（フロントエンド）

**ユーザーストーリー**: 
受付スタッフとして、私はブラウザ上でカメラから QRコードをスキャンしたいので、紙や画面に表示された参加者 QRコードを素早く読み込むことができます。

#### 受け入れ基準

1. WHEN Reception_Staff が Frontend_Application を開く、THE Frontend_Application SHALL ブラウザのカメラにアクセスするためのユーザー許可を要求する
2. WHEN Reception_Staff が カメラ使用を許可する、THE Frontend_Application SHALL リアルタイムでカメラ映像を画面中央に表示する
3. WHEN QR_Code が カメラ映像内で検出される、THE Frontend_Application SHALL jsQR または zbar.js ライブラリを使用して QR_Code_Data（ユーザー名）を抽出する
4. WHEN QR_Code_Data が 抽出される、THE Frontend_Application SHALL 100 ミリ秒以内に Backend_System の登録 API エンドポイントに送信する
5. IF Reception_Staff が カメラへのアクセスを拒否する、THEN Frontend_Application SHALL 「カメラが利用できません。ブラウザの設定を確認してください」というメッセージを表示する
6. WHERE 複数の QR_Code が同時に検出される場合、THE Frontend_Application SHALL 最初に検出された QR_Code のみを処理する

---

### 要件 2: API パスワード認証

**ユーザーストーリー**: 
受付スタッフとして、私はシンプルなパスワード認証で Backend_System に安全にアクセスしたいので、受付端末ごとのセッション管理の複雑性を避けることができます。

#### 受け入れ基準

1. WHEN Frontend_Application が Backend_System に QR_Code_Data を送信する、THE Frontend_Application SHALL HTTP Authorization ヘッダに「Bearer {API_Password}」形式でパスワードを含める
2. WHEN Backend_System が リクエストを受信する、THE API_Authentication_Middleware SHALL Authorization ヘッダから API_Password を抽出し、環境変数 API_PASSWORD と一致するか検証する
3. IF API_Password が正しい、THEN Backend_System SHALL リクエストを処理する
4. IF API_Password が 不正である、THEN Backend_System SHALL HTTP 401 Unauthorized エラー「INVALID_PASSWORD」を返す
5. WHEN Backend_System が 起動時に API_Password_Expiry を読み込む、THE System SHALL 現在時刻と照合し、有効期限切れをチェックする
6. IF API_Password の有効期限が 切れている、THEN Backend_System SHALL すべてのリクエストに HTTP 401 エラー「PASSWORD_EXPIRED」を返す

---

### 要件 3: Connpass 参加者検証

**ユーザーストーリー**: 
イベント主催者として、私はシステムが QR_Code_Data を受け取ったときに、Connpass イベントの実際の参加者一覧と照合して、参加者の確認をしたいので、不正な参加者の登録を防ぐことができます。

#### 受け入れ基準

1. WHEN Backend_System が API_Password を検証する、THE Backend_System SHALL すぐに Connpass_Session を確認し、有効であるか検査する
2. IF Connpass_Session が 無効である、THEN Backend_System SHALL 自動的に Connpass_Session を再確立する（環境変数 CONNPASS_EMAIL、CONNPASS_PASSWORD を使用）
3. WHEN Backend_System が QR_Code_Data と Connpass_Event_URL を受け取る、THE Backend_System SHALL Puppeteer または Playwright を使用してイベントページにアクセスする
4. WHEN Backend_System が Connpass_Event_URL に アクセスする、THE Backend_System SHALL Participant_List（参加者一覧）をスクレイピングで抽出する
5. WHEN Participant_List を 抽出した後、THE Backend_System SHALL 該当する QR_Code_Data を Participant_List から検索する
6. IF QR_Code_Data が Participant_List に マッチしない、THEN Backend_System SHALL HTTP 400 エラー「PARTICIPANT_NOT_FOUND」を返す
7. IF スクレイピング処理が 失敗する、THEN Backend_System SHALL HTTP 500 エラー「SCRAPING_FAILED」を返す
8. WHERE パフォーマンス最適化のため、同じ Connpass_Event_URL への短時間内のリクエストは、前回のスクレイピング結果をキャッシュ（TTL: 5-10 秒）として使用する

---

### 要件 4: 参加登録処理

**ユーザーストーリー**: 
イベント主催者として、私は参加者が Connpass 参加者一覧に確認されたときに、その参加者の Registration_Record を作成して二重登録を防止したいので、参加登録の履歴を追跡できます。

#### 受け入れ基準

1. WHEN Backend_System が QR_Code_Data を Participant_List で確認する、THE Backend_System SHALL タイムスタンプ（ISO 8601 形式）を含む新しい Registration_Record を作成する
2. WHEN Registration_Record を 作成する際、THE Backend_System SHALL 以下のフィールドを記録する：QR_Code_Data（ユーザー名）、Connpass_Event_URL、Registration_Status（SUCCESS）、登録タイムスタンプ、リクエスト元 IP アドレス
3. WHEN Registration_Record が 正常に作成される、THE Backend_System SHALL HTTP 200 で成功レスポンスを返す
4. IF 同じ QR_Code_Data と Connpass_Event_URL の組み合わせが すでに Registration_Record に 存在する、THEN Backend_System SHALL HTTP 400 エラー「ALREADY_REGISTERED」を返す
5. WHEN Registration_Record が 作成された直後、THE Backend_System SHALL すぐに Storage_Destination への保存処理を開始する

---

### 要件 5: Google スプレッドシートまたは CSV への自動保存

**ユーザーストーリー**: 
イベント主催者として、私は Registration_Record が自動的に Google スプレッドシートまたは CSV ファイルに保存されるようにしたいので、オフラインでのデータ確認や外部ツールでの集計が可能です。

#### 受け入れ基準

1. WHEN 新しい Registration_Record が Backend_System で作成される、THE Storage_System SHALL その Registration_Record をあらかじめ指定された Storage_Destination に追記する
2. WHERE Storage_Destination が Google_Spreadsheet として設定されている場合、THE Storage_System SHALL Google Sheets API を使用して新しい行をスプレッドシートに挿入する
3. WHERE Storage_Destination が CSV_File として設定されている場合、THE Storage_System SHALL CSV ファイルに新しい行を追記する
4. WHEN 登録情報を Storage_Destination に保存する、THE Storage_System SHALL 以下のフィールドを含める: QR_Code_Data、登録タイムスタンプ、Connpass_Event_URL、Registration_Status
5. WHEN Google Sheets への保存に失敗する、THE Error_Handler SHALL エラーをログに記録し、リトライ処理を最大 3 回実行する（100ms 間隔）
6. IF 3 回のリトライ後もエラーが継続する、THEN Backend_System SHALL エラーをログに記録するが、登録自体は成功状態とする
7. WHEN CSV ファイルへの保存中にファイルロックが発生する、THE System SHALL 100 ミリ秒待機してから再度保存を試行する

---

### 要件 6: エラーハンドリングと監査証跡

**ユーザーストーリー**: 
受付スタッフとして、私はエラーが発生したときに何が起こったかを明確に理解したいので、システムが具体的でアクション可能なエラーメッセージを表示します。また、イベント主催者として、私はシステムのすべての操作をログで追跡したいので、トラブルシューティングと監査が可能です。

#### 受け入れ基準

1. WHEN Backend_System が エラーを検出する、THE System SHALL 以下の 8 つのエラーコードのいずれかを返す：INVALID_PASSWORD、PASSWORD_EXPIRED、INVALID_QR_FORMAT、PARTICIPANT_NOT_FOUND、SCRAPING_FAILED、SESSION_EXPIRED、NETWORK_ERROR、INTERNAL_SERVER_ERROR
2. WHEN エラーコード INVALID_PASSWORD が 発生する、THE System SHALL HTTP 401 を返し、メッセージ「認証に失敗しました。パスワードを確認してください」を記録する
3. WHEN エラーコード PASSWORD_EXPIRED が 発生する、THE System SHALL HTTP 401 を返し、メッセージ「API パスワードの有効期限が切れています。管理者に連絡してください」を記録する
4. WHEN エラーコード INVALID_QR_FORMAT が 発生する、THE System SHALL HTTP 400 を返し、メッセージ「QRコードの形式が無効です」を記録する
5. WHEN エラーコード PARTICIPANT_NOT_FOUND が 発生する、THE System SHALL HTTP 400 を返し、メッセージ「このユーザーはイベント参加者一覧に見つかりません」を記録する
6. WHEN エラーコード SCRAPING_FAILED が 発生する、THE System SHALL HTTP 500 を返し、メッセージ「イベント情報の取得に失敗しました。管理者に報告してください」を記録する
7. WHEN エラーコード SESSION_EXPIRED が 発生する、THE System SHALL HTTP 500 を返し、メッセージ「セッションが期限切れになっています。システムを再起動してください」を記録する
8. WHEN エラーコード NETWORK_ERROR が 発生する、THE System SHALL HTTP 500 を返し、メッセージ「インターネット接続を確認してください」を記録する
9. WHEN エラーコード INTERNAL_SERVER_ERROR が 発生する、THE System SHALL HTTP 500 を返し、メッセージ「予期しないエラーが発生しました。システム管理者に連絡してください」を記録する
10. WHEN すべてのリクエスト・レスポンスが 処理される、THE Audit_System SHALL タイムスタンプ、リクエスト内容、レスポンス内容、エラーコード（該当時）をログに記録する
11. THE Audit_System SHALL API_Password や個人情報をログに出力しない（機密情報を除外）
12. THE Audit_System SHALL ログを最小限 30 日間保持する

---

## 備考

- このシステムは **フロントエンド（Frontend_Application）** と **バックエンド（Backend_System）** の 2 つの独立したデプロイメントユニットから構成されます
- Frontend_Application はブラウザベースで、QRコード読み取り UI のみを提供します
- Backend_System は Node.js / Python などで実装され、すべてのビジネスロジック（Connpass セッション管理、スクレイピング、登録処理）を担当します
- Backend_System 起動時に、環境変数から Connpass ログイン情報を読み込み、自動的にセッション確立を行い、複数受付端末からのリクエストを処理します
- セキュリティ要件（HTTPS/TLS、API パスワード管理、ログの機密情報除外）は、設計フェーズで詳細に定義されます
- すべての受け入れ基準は、自動テスト、統合テスト、または受け入れテストで検証可能な形になっています
