# 要件定義書: イベント参加用 QRコード受付システム

## イントロダクション

本システムは、イベント会場での参加者受付を効率化するための Webアプリケーションです。受付スタッフがブラウザ上で QRコードを読み取り、参加者情報をバックエンドに登録し、その結果を Google スプレッドシートまたは CSV に自動保存します。

システムはセッションベースの認証を採用し、受付機器がログイン状態を維持したまま、継続的に QRコードを読み取り・登録できる仕組みになっています。

## 用語集（Glossary）

- **Reception_Staff**: イベント会場で参加者受付を行う担当者
- **Participant**: イベントに参加する者
- **QR_Code**: 参加者の登録情報を含む一意の二次元バーコード
- **Session**: 受付機器とシステム間で確立される認証済みのユーザーセッション
- **Event_Page**: 受付スタッフがログインして QRコード読み取りを行うページ
- **Registration_System**: QRコード情報をイベント参加登録として処理するバックエンドシステム
- **Registration_Record**: 参加者が参加登録されたことを示す記録（タイムスタンプ、参加者情報を含む）
- **Storage_Destination**: 登録情報を保存する先（Google スプレッドシートまたは CSV ファイル）
- **Error_Code**: エラー状況を識別するための一意の値（例：ALREADY_REGISTERED, INVALID_QR など）

## 要件

### 要件 1: QRコード読み取り機能

**ユーザーストーリー**: 
受付スタッフとして、私はブラウザ上で QRコードをスキャンしたいので、紙や画面に表示された参加者 QRコードを素早く読み込むことができます。

#### 受け入れ基準

1. WHEN Reception_Staff が Event_Page にアクセスしてセッションがアクティブである、THE QR_Code_Reader SHALL ブラウザのカメラにアクセスするためのユーザー許可を要求する
2. WHEN Reception_Staff が カメラ使用を許可する、THE QR_Code_Reader SHALL リアルタイムでカメラ映像を Event_Page に表示する
3. WHEN QR_Code が カメラ映像内で検出される、THE QR_Code_Reader SHALL その QR_Code に含まれるデータを抽出し、すぐに次のステップに送る
4. WHEN QR_Code_Reader が QR_Code_Data を抽出する、THE System SHALL 500ミリ秒以内に Registration_System に送信する
5. IF Reception_Staff が カメラへのアクセスを拒否する、THEN Event_Page SHALL 「カメラが利用できません。ブラウザの設定を確認してください」というメッセージを表示する
6. WHERE 複数の QR_Code が同時に検出される場合、THE QR_Code_Reader SHALL 最初に検出された QR_Code のみを処理する

---

### 要件 2: セッション管理と受付スタッフ認証

**ユーザーストーリー**: 
受付スタッフとして、私はあらかじめ Event_Page にログインしておきたいので、QRコード読み取り時にセッションが維持され、継続的に登録処理を実行できます。

#### 受け入れ基準

1. WHEN Reception_Staff が Event_Page にログインする、THE Authentication_System SHALL ログイン認証情報（ユーザーID、パスワード）を検証する
2. WHEN ログイン認証情報が正しい、THE Authentication_System SHALL Session_Token を生成し、受付機器のブラウザに保存する
3. WHILE Session_Token がアクティブである、THE Registration_System SHALL Reception_Staff のセッション情報を使用して QRコード読み取り要求を処理する
4. WHEN Reception_Staff が QRコードを読み取る、THE System SHALL 送信されたリクエストに Session_Token を自動的に付加する
5. IF Session_Token の有効期限が切れる、THEN System SHALL Reception_Staff に「セッションが期限切れです。再度ログインしてください」というメッセージを表示し、Event_Page をログイン画面にリダイレクトする
6. WHERE Reception_Staff が 30 分間にアクティビティがない場合、THE Session_Token は自動的に期限切れとなる

---

### 要件 3: 参加登録のバックエンド処理

**ユーザーストーリー**: 
イベント主催者として、私はシステムが QRコードデータを受け取ったときに、参加者の登録情報をデータベース（または他の中間ストレージ）に記録したいので、二重登録を防止し、参加者の登録状態を追跡できます。

#### 受け入れ基準

1. WHEN QRコード読み取り後に Registration_System が QR_Code_Data を受け取る、THE Registration_System SHALL QR_Code_Data に含まれる参加者識別子の形式を検証する
2. WHEN 参加者識別子が有効である、THE Registration_System SHALL その参加者がすでに Registration_Record に存在するかを確認する
3. WHEN 参加者が未登録である、THE Registration_System SHALL タイムスタンプを含む新しい Registration_Record を作成し、内部ストレージに保存する
4. WHEN Registration_Record の作成に成功する、THE System SHALL Reception_Staff に「登録完了」という成功メッセージをリアルタイムで表示する
5. IF 参加者がすでに登録済みである、THEN System SHALL「すでに登録済みです」というエラーメッセージを表示し、新しい Registration_Record は作成しない
6. IF 参加者識別子が無効である、THEN System SHALL エラーメッセージ「無効な QRコードです」を表示する
7. WHEN Registration_Record が正常に作成される、THE System SHALL すぐに Storage_Destination への保存処理を開始する

---

### 要件 4: Google スプレッドシートまたは CSV への自動保存

**ユーザーストーリー**: 
イベント主催者として、私は Registration_Record が自動的に Google スプレッドシートまたは CSV ファイルに保存されるようにしたいので、オフラインでのデータ確認や外部ツールでの集計が可能です。

#### 受け入れ基準

1. WHEN 新しい Registration_Record が Registration_System で作成される、THE Storage_System SHALL その Registration_Record をあらかじめ指定された Storage_Destination に追記する
2. WHERE Storage_Destination が Google_Spreadsheet として設定されている場合、THE Storage_System SHALL Google Sheets API を使用して新しい行をスプレッドシートに挿入する
3. WHERE Storage_Destination が CSV_File として設定されている場合、THE Storage_System SHALL CSV ファイルに新しい行を追記する
4. WHEN 登録情報を Storage_Destination に保存する、THE Storage_System SHALL 以下のフィールドを含める: 参加者識別子、登録タイムスタンプ、受付スタッフ ID、イベント名
5. WHEN Google Sheets への保存に失敗する、THE Error_Handler SHALL エラーをログに記録し、リトライ処理を最大 3 回実行する
6. IF 3 回のリトライ後もエラーが継続する、THEN System SHALL Reception_Staff に「登録情報の保存に失敗しました。管理者に報告してください」というメッセージを表示する
7. WHEN CSV ファイルへの保存中にファイルロックが発生する、THE System SHALL 100 ミリ秒待機してから再度保存を試行する

---

### 要件 5: エラーハンドリングと例外管理

**ユーザーストーリー**: 
受付スタッフとして、私はエラーが発生したときに何が起こったかを明確に理解したいので、システムが具体的でアクション可能なエラーメッセージを表示します。

#### 受け入れ基準

1. WHEN QRコード読み取り失敗が発生する、THE System SHALL エラーコード（例：INVALID_QR_FORMAT）と日本語の説明メッセージを Reception_Staff に表示する
2. WHEN 参加者が既に登録済みである、THE System SHALL エラーコード ALREADY_REGISTERED とメッセージ「この参加者はすでに登録済みです。二重登録はできません」を表示する
3. WHEN ネットワーク接続が失われる、THE System SHALL オフライン状態をインジケータで表示し、「インターネット接続を確認してください」というメッセージを表示する
4. WHEN バックエンド Registration_System が応答しない、THE System SHALL 接続タイムアウト時間（デフォルト 10 秒）経過後に「サーバーに接続できません。管理者に連絡してください」というメッセージを表示する
5. IF QRコード読み取り後、バックエンドから予期しない応答が返される、THEN System SHALL エラーメッセージ「予期しないエラーが発生しました。システム管理者に連絡してください」を表示し、エラー詳細をサーバーログに記録する
6. WHEN Reception_Staff が連続して 5 回無効な QRコードをスキャンする、THE System SHALL 「無効な QRコードが連続しています。QRコードを確認してください」という警告メッセージを表示する

---

### 要件 6: QRコード読み取り UI/UX

**ユーザーストーリー**: 
受付スタッフとして、私は QRコード読み取り画面が使いやすく、ストレスなく素早く処理を進められるようにしたいので、視認性の高い UI と明確なフィードバックを必要とします。

#### 受け入れ基準

1. WHEN Event_Page がセッション状態で表示される、THE UI SHALL カメラプレビュー領域を画面の中央に表示する
2. WHEN QRコード が正常に検出される、THE UI SHALL 成功音（または振動フィードバック）を 200 ミリ秒間提供し、緑色のフレームで QRコードが検出されたことを示す
3. WHEN 登録処理が完了する、THE UI SHALL 「登録完了」というメッセージを 2 秒間表示し、その後カメラプレビューが次の QRコード読み取り用に自動的に復帰する
4. IF エラーが発生する、THE UI SHALL 赤色の警告フレームを表示し、エラーメッセージを 3 秒間表示する
5. WHEN 受付スタッフが ボタンを操作する、THE UI SHALL ボタンの応答時間（クリック～反応）が 100 ミリ秒以下であることを保証する
6. WHERE スマートフォンなどのモバイル端末から Event_Page にアクセスする場合、THE UI SHALL レスポンシブデザインで適切に表示される

---

### 要件 7: ログと監査証跡

**ユーザーストーリー**: 
イベント主催者として、私はどの受付スタッフがいつどの参加者を登録したかを記録したいので、監査とトラブルシューティングが可能です。

#### 受け入れ基準

1. WHEN QRコードが正常に読み取られ、登録処理が開始される、THE Audit_System SHALL タイムスタンプ、Reception_Staff ID、参加者識別子、QRコード値、Processing_Status を記録する
2. WHEN エラーが発生する、THE Audit_System SHALL タイムスタンプ、Receipt_Staff ID、Error_Code、エラー詳細を記録する
3. WHEN 登録情報が Storage_Destination に保存される、THE Audit_System SHALL 保存操作の成功/失敗、保存先、保存タイムスタンプを記録する
4. THE Audit_System SHALL 記録されたログを最小限 30 日間保持する

---

## 備考

- このシステムは複数の受付機器から同時にアクセスされることを想定しており、マルチユーザー環境下での一貫性を必要とします。
- セキュリティ要件（通信の暗号化、認証トークンの安全な保存）については、設計フェーズで詳細に定義します。
- 各受け入れ基準は、自動テスト、統合テスト、または受け入れテストで検証可能な形になっています。
