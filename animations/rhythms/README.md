# Rhythm adapters

各リズムは1つのRhythmConfigをexportします。心臓内電気現象、興奮、収縮、ECGを別々の事実源から作らず、この設定から共通timelineへイベントを展開してください。

新しいリズムの追加手順：

1. `sinus.js`を直接変更せず、新しい`rhythms/<id>.js`を作成する。
2. 刺激源、RR列、心房興奮、AV伝導、His-Purkinje伝導、心室興奮、収縮、ECGを定義する。
3. 正常洞調律の複合フレームを流用せず、解剖・ラベル配置を維持した生理レイヤーを用意する。
4. `scripts/validate-rhythm.js`を実行する。
5. `scripts/create-rhythm.js`のregistryへ追加する。
6. 心臓イベントとP/QRS/Tの同期テストを追加する。

AFは`atrial-fibrillation.js`、右脚ブロックは`right-bundle-branch-block.js`で実装済みです。AFL、PSVT、PVC、VT、完全房室ブロックは未実装です。
