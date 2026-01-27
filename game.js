// game.js - 修正版 v13.0 (Part 1/2)
// ・ガイダンス画面での資産変動確認フローの実装
// ・子どもルーレット修正
// ・解説文＆デザイン完全維持

// ==========================================================
// 0. Firebase設定
// ==========================================================
const firebaseConfig = {
  apiKey: "AIzaSyC2M3jt4skKm_eqxZjl9H7UhESboidXN0M",
  authDomain: "lifemarrige-293b1.firebaseapp.com",
  databaseURL: "https://lifemarrige-293b1-default-rtdb.firebaseio.com",
  projectId: "lifemarrige-293b1",
  storageBucket: "lifemarrige-293b1.firebasestorage.app",
  messagingSenderId: "12201049552",
  appId: "1:12201049552:web:4b369bb67baaf47b2b8dd5"
};

let database = null;
try {
    if (typeof firebase !== 'undefined' && firebaseConfig.apiKey !== "YOUR_API_KEY") {
        firebase.initializeApp(firebaseConfig);
        database = firebase.database();
        console.log("Firebase initialized");
    }
} catch (e) {
    console.error("Firebase Init Error:", e);
}

let currentRoomId = null;

// ==========================================================
// 1. カードデータ定義 (詳細解説文を完全維持)
// ==========================================================
const CARD_DATA = {
    // --- 職業カード ---
    "J001": { 
        title: "職業: 会社員", type: "job", image: "会社員.png", salary: { 30: 400, 40: 500, 50: 600, 60: 600 }, life_point: 5, 
        explanation: "<h3>会社員</h3><p><strong>【特徴】</strong><br>最も標準的な職業です。給与は30代から60代にかけて緩やかに上昇し、退職金もしっかり出るため、長期的なライフプランが立てやすいのが魅力です。</p><p><strong>【現実のデータ】</strong><br>平均年収は約450万〜550万円ですが、業界や企業規模により大きく異なります。厚生年金や健康保険などの社会保障が手厚いのも大きなメリットです。</p>" 
    },
    "J002": { 
        title: "職業: 公務員", type: "job", image: "公務員.png", salary: { 30: 500, 40: 600, 50: 700, 60: 700 }, life_point: 5, 
        explanation: "<h3>公務員</h3><p><strong>【特徴】</strong><br>「安定」の代名詞。景気変動イベント（好景気・不景気）の影響を受けにくく、給与カットやリストラのリスクが極めて低いです。退職金も高水準で安定しています。</p><p><strong>【現実のデータ】</strong><br>地方公務員の平均年収は約600万円前後。民間企業の給与水準に連動して決まりますが、生涯賃金で見ると民間平均より高くなる傾向があります。</p>" 
    },
    "J003": { 
        title: "職業: 料理人", type: "job", image: "料理人.png", salary: { 30: 250, 40: 300, 50: 400, 60: 400 }, life_point: 10, 
        explanation: "<h3>料理人</h3><p><strong>【特徴】</strong><br>大器晩成型です。若い頃の給与は低いですが、技術を磨くことで50代以降に独立や料理長昇格などで収入を伸ばせる可能性があります。特定のイベントで臨時収入が発生することもあります。</p><p><strong>【現実のデータ】</strong><br>平均年収は350万〜450万円。厳しい修行期間がありますが、腕一本で世界を渡り歩けるスキルが身につく職業です。</p>" 
    },
    "J004": { 
        title: "職業: 保育士", type: "job", image: "保育士.png", salary: { 30: 300, 40: 350, 50: 450, 60: 450 }, life_point: 10, 
        explanation: "<h3>保育士</h3><p><strong>【特徴】</strong><br>子供の成長を見守る、やりがいに溢れた仕事です。給与水準は決して高くありませんが、職業特性として「ライフポイント（幸福度）」が高く設定されています。</p><p><strong>【現実のデータ】</strong><br>平均年収は約380万円前後。国による処遇改善が進んでいますが、責任の重さに対して給与が見合っていないという課題も指摘されています。</p>" 
    },
    "J005": { 
        title: "職業: 医師", type: "job", image: "医師.png", salary: { 30: 1000, 40: 1500, 50: 1700, 60: 1700 }, life_point: 15, 
        explanation: "<h3>医師</h3><p><strong>【特徴】</strong><br>圧倒的な高収入を誇ります。資金力で様々な問題を解決できますが、激務によるストレスや、高額な教育費などの支出も多くなる傾向があります。</p><p><strong>【現実のデータ】</strong><br>勤務医の平均年収は約1,200万〜1,500万円。高収入ですが、長時間労働や当直など、身体的な負担も大きい職業です。</p>" 
    },
    "J006": { 
        title: "職業: 看護師", type: "job", image: "看護師.png", salary: { 30: 450, 40: 600, 50: 700, 60: 700 }, life_point: 10, 
        explanation: "<h3>看護師</h3><p><strong>【特徴】</strong><br>高水準のバランス型です。一般的な会社員よりもベース給与が高く、かつ医師ほど極端ではないため、安定して高収入を得られます。景気に左右されにくいのも強みです。</p><p><strong>【現実のデータ】</strong><br>平均年収は約490万円。夜勤手当などが大きいため、若いうちから比較的高い年収を得ることができます。</p>" 
    },
    "J007": { 
        title: "職業: 美容師", type: "job", image: "美容師.png", salary: { 30: 350, 40: 400, 50: 450, 60: 450 }, life_point: 10, 
        explanation: "<h3>美容師</h3><p><strong>【特徴】</strong><br>センスと技術の世界。給与は控えめからのスタートですが、ライフポイント（やりがい・おしゃれ度）が高めです。退職金制度がない場合が多いため、自身での資産形成（iDeCoやつみたてNISAなど）が重要になります。</p><p><strong>【現実のデータ】</strong><br>平均年収は約330万円。独立開業して成功すれば年収1000万超えも夢ではありませんが、競争も激しい世界です。</p>" 
    },
    "J008": { 
        title: "職業: フリーター", type: "job", image: "フリーター.png", salary: { 30: 200, 40: 200, 50: 200, 60: 200 }, life_point: 5, 
        explanation: "<h3>フリーター</h3><p><strong>【特徴】</strong><br>組織に縛られない自由な働き方です。収入は低く昇給もありませんが、特定のイベントで「自由であること」のメリットを受ける場合があります。老後資金の準備が最大の課題です。</p><p><strong>【現実のデータ】</strong><br>フルタイム換算でも年収200万円前後にとどまることが多く、生涯賃金では正社員と大きな差がつきます。</p>" 
    },
    "J009": { 
        title: "職業: パート従業員", type: "job", image: "パート.png", salary: { 30: 100, 40: 100, 50: 100, 60: 100 }, life_point: 5, 
        explanation: "<h3>パート従業員</h3><p><strong>【特徴】</strong><br>家庭との両立を重視する働き方です。主に配偶者（プレイヤー2）が選択します。世帯収入を底上げしつつ、無理のない範囲で働きます。</p><p><strong>【現実のデータ】</strong><br>年収103万円や130万円の壁を意識して働くケースが多いです。短時間勤務で家計を補助する重要な役割を果たします。</p>" 
    },
    "J010": { 
        title: "職業: 専業主婦（主夫）", type: "job", image: "専業主婦.png", salary: { 30: 0, 40: 0, 50: 0, 60: 0 }, life_point: 10, 
        explanation: "<h3>専業主婦（主夫）</h3><p><strong>【特徴】</strong><br>家庭を守るプロフェッショナル。収入はゼロですが、高いライフポイント補正を持ちます。パートナーが高収入であれば、非常に安定した幸福な生活を送ることができます。</p><p><strong>【現実のデータ】</strong><br>金銭的な報酬はありませんが、家事・育児などの無償労働を貨幣換算すると年収300万円〜1000万円相当の価値があるとも言われています。</p>" 
    },

    // --- 結婚カード ---
    "M001": { title: "結婚💍 - 親族のみの挙式", type: "marriage", image: "親族のみ.jpg", costsByIncome: { low: 150, mid: 200, high: 300 }, life_point: 10, explanation: `<h3>親族のみの結婚式</h3><p><strong>【概要】</strong><br>家族や親族だけで行う少人数スタイル。派手な演出は控え、挙式後の食事会でゆっくり会話を楽しむのが主流です。アットホームで準備の負担も少なめです。</p><p><strong>【平均費用】</strong><br>親族のみで行う場合、招待人数によって費用は変動しますが、10名～20名規模が一般的です。<br><ul><li><strong>10名の場合：</strong> 約100万～120万円程度</li><li><strong>20名の場合：</strong> 約130万～190万円程度</li></ul></p><p class="source-text" style="font-size:0.8em; color:#666; text-align:right;">～ハナユメ、ゼクシィより参照</p>` },
    "M002": { title: "結婚💍 - 標準的な挙式", type: "marriage", image: "標準的.jpg", costsByIncome: { low: 300, mid: 400, high: 600 }, life_point: 30, explanation: `<h3>標準的な結婚式</h3><p><strong>【概要】</strong><br>挙式と披露宴をセットで行う最も一般的なスタイル。友人や職場関係者も招き、ケーキ入刀や余興などの定番演出でゲストをもてなします。</p><p><strong>【平均費用】</strong><br>約344万円（平均52名）。<br>この金額には挙式料、料理、衣裳、装花、ギフトなどが含まれます。</p><p class="source-text" style="font-size:0.8em; color:#666; text-align:right;">～ゼクシィ結婚トレンド調査2024より参照</p>` },
    "M003": { title: "結婚💍 - 豪華な挙式", type: "marriage", image: "豪華.jpg", costsByIncome: { low: 500, mid: 600, high: 800 }, life_point: 50, explanation: `<h3>豪華な結婚式</h3><p><strong>【概要】</strong><br>有名ホテルや高級式場で、質・規模ともに最上級を目指すスタイル。料理・衣裳・演出のすべてに徹底的にこだわり、圧倒的な非日常空間を作り上げます。</p><p><strong>【平均費用】</strong><br>450万～600万円以上（80名以上や高グレード選択時）。<br>有名ホテルや、こだわりを詰め込んだ場合、総額が500万円を超えるケースも珍しくありません。</p><p class="source-text" style="font-size:0.8em; color:#666; text-align:right;">～マイナビウエディング他より参照</p>` },

    // --- 子どもカード ---
    "C001": { 
        title: "子供 1人", 
        type: "children", 
        costsByIncome: { low: 60, mid: 90, high: 150 }, 
        life_point: 20, 
        explanation: `
            <h3>子ども1人の場合</h3>
            <p><strong>【概要】</strong><br>資金を1人に集中できるため、私立学校への進学や専門的な習い事など、手厚い教育投資がしやすい環境です。進路選択の幅が最も広いパターンと言えます。</p>
            <p><strong>【教育費目安：約1,000万～2,200万円】</strong><br>幼稚園から大学卒業までにかかる学費等の総額目安です。<br>
            <ul><li><strong>全て国公立：</strong> 約800万～1,000万円</li><li><strong>全て私立(理系)：</strong> 約2,200万円以上</li></ul></p>
            
            <details style="margin-top:15px; border:1px solid #ddd; padding:10px; border-radius:5px; background:#f9f9f9;">
                <summary style="cursor:pointer; font-weight:bold; color:#2b6cb0;">📊 年代別の年間負担額（目安）</summary>
                <div style="margin-top:10px; font-size:0.95em;">
                    <p style="font-weight:bold; border-bottom:1px solid #ccc; padding-bottom:5px;">🟢 30代（前期）：36万 ～ 90万円 /年</p>
                    <p style="font-size:0.85em; color:#666; margin-bottom:10px;">小学校卒業まで。公立中心なら費用は緩やか。「貯めどき」なので将来に備えて投資へ。</p>
                    
                    <p style="font-weight:bold; border-bottom:1px solid #ccc; padding-bottom:5px;">🔴 40代（後期）：84万 ～ 210万円 /年</p>
                    <p style="font-size:0.85em; color:#666;">中・高・大。入学金や授業料が重なるピーク時。私立理系や下宿ならさらに負担増。</p>
                    
                    <p class="source-text" style="font-size:0.8em; color:#888; text-align:right; margin-top:5px;">※金額は世帯年収により変動<br>出典：文部科学省「子供の学習費調査」等より独自試算</p>
                </div>
            </details>
            ` 
    },
    "C002": { 
        title: "子供 2人", 
        type: "children", 
        costsByIncome: { low: 90, mid: 150, high: 250 }, 
        life_point: 40, 
        explanation: `
            <h3>子ども2人の場合</h3>
            <p><strong>【概要】</strong><br>最も標準的な家族構成です。教育資金のバランスを考えつつ、計画的に積み立てていく必要があります。</p>
            <p><strong>【教育費目安：約2,000万～4,500万円】</strong><br>2人分の学費総額の目安です。<br>
            <ul><li><strong>全て国公立：</strong> 約1,600万～2,000万円</li><li><strong>全て私立(理系)：</strong> 約4,500万円以上</li></ul></p>
            
            <details style="margin-top:15px; border:1px solid #ddd; padding:10px; border-radius:5px; background:#f9f9f9;">
                <summary style="cursor:pointer; font-weight:bold; color:#2b6cb0;">📊 年代別の年間負担額（目安）</summary>
                <div style="margin-top:10px; font-size:0.95em;">
                    <p style="font-weight:bold; border-bottom:1px solid #ccc; padding-bottom:5px;">🟢 30代（前期）：54万 ～ 150万円 /年</p>
                    <p style="font-size:0.85em; color:#666; margin-bottom:10px;">まだ家計に余裕がある時期。ここで使いすぎず、確実に資金をプールするのが鉄則。</p>
                    
                    <p style="font-weight:bold; border-bottom:1px solid #ccc; padding-bottom:5px;">🔴 40代（後期）：126万 ～ 350万円 /年</p>
                    <p style="font-size:0.85em; color:#666;">2人の進学が重なる「魔の時期」。私立大学×2人なら支出は超高額に。</p>
                    
                    <p class="source-text" style="font-size:0.8em; color:#888; text-align:right; margin-top:5px;">※金額は世帯年収により変動<br>出典：文部科学省「子供の学習費調査」等より独自試算</p>
                </div>
            </details>
            ` 
    },
    "C003": { 
        title: "子供 3人", 
        type: "children", 
        costsByIncome: { low: 110, mid: 170, high: 290 }, 
        life_point: 60, 
        explanation: `
            <h3>子ども3人の場合</h3>
            <p><strong>【概要】</strong><br>教育費の総額は非常に大きくなりますが、兄弟姉妹で学び合う環境が得られます。</p>
            <p><strong>【教育費目安：約3,000万～6,800万円】</strong><br>3人分の学費総額の目安です。<br>
            <ul><li><strong>全て国公立：</strong> 約2,400万～3,000万円</li><li><strong>全て私立(理系)：</strong> 約6,800万円以上</li></ul></p>
            
            <details style="margin-top:15px; border:1px solid #ddd; padding:10px; border-radius:5px; background:#f9f9f9;">
                <summary style="cursor:pointer; font-weight:bold; color:#2b6cb0;">📊 年代別の年間負担額（目安）</summary>
                <div style="margin-top:10px; font-size:0.95em;">
                    <p style="font-weight:bold; border-bottom:1px solid #ccc; padding-bottom:5px;">🟢 30代（前期）：66万 ～ 174万円 /年</p>
                    <p style="font-size:0.85em; color:#666; margin-bottom:10px;">児童手当などがあるうちに貯蓄へ。3人分の学費を見据えた早めの準備がカギ。</p>
                    
                    <p style="font-weight:bold; border-bottom:1px solid #ccc; padding-bottom:5px;">🔴 40代（後期）：154万 ～ 406万円 /年</p>
                    <p style="font-size:0.85em; color:#666;">怒涛の学費ラッシュ。下宿などが重なると家計は一時的に赤字になることも。</p>
                    
                    <p class="source-text" style="font-size:0.8em; color:#888; text-align:right; margin-top:5px;">※金額は世帯年収により変動<br>出典：文部科学省「子供の学習費調査」等より独自試算</p>
                </div>
            </details>
            ` 
    },

    // --- 住宅カード ---
    "H001": { title: "一戸建て - お手ごろ", type: "house", costsByIncome: { low: 50, mid: 100, high: 160 }, life_point: 30, explanation: `<h3>一戸建て</h3><p><strong>【特徴】</strong><br>独立性が高く、上下階の騒音トラブルを気にせず子育てができます。駐車場代がかからないことが多く、庭を持てるのも魅力です。</p><p><strong>【平均費用：約3,800万～4,900万円】</strong><br>土地付き注文住宅の全国平均費用です。<br><ul><li><strong>メリット：</strong> 建物が古くなっても「土地」という資産が確実に残ります。</li><li><strong>注意点：</strong> 建物の修繕（外壁塗装や屋根修理など）の手配・費用負担はすべて「自己責任」です。また、セキュリティ対策やゴミ当番、町内会などの地域活動も自分たちで行う必要があります。</li></ul></p><p class="source-text" style="font-size:0.8em; color:#666; text-align:right;">～住宅金融支援機構「フラット35利用者調査」等より参照</p>` },
    "H002": { title: "一戸建て - 標準",   type: "house", costsByIncome: { low: 65, mid: 130, high: 170 }, life_point: 40, explanation: `<h3>一戸建て</h3><p><strong>【特徴】</strong><br>独立性が高く、上下階の騒音トラブルを気にせず子育てができます。駐車場代がかからないことが多く、庭を持てるのも魅力です。</p><p><strong>【平均費用：約3,800万～4,900万円】</strong><br>土地付き注文住宅の全国平均費用です。<br><ul><li><strong>メリット：</strong> 建物が古くなっても「土地」という資産が確実に残ります。</li><li><strong>注意点：</strong> 建物の修繕（外壁塗装や屋根修理など）の手配・費用負担はすべて「自己責任」です。また、セキュリティ対策やゴミ当番、町内会などの地域活動も自分たちで行う必要があります。</li></ul></p><p class="source-text" style="font-size:0.8em; color:#666; text-align:right;">～住宅金融支援機構「フラット35利用者調査」等より参照</p>` },
    "H003": { title: "一戸建て - 豪華",   type: "house", costsByIncome: { low: 130, mid: 200, high: 270 }, life_point: 60, explanation: `<h3>一戸建て</h3><p><strong>【特徴】</strong><br>独立性が高く、上下階の騒音トラブルを気にせず子育てができます。駐車場代がかからないことが多く、庭を持てるのも魅力です。</p><p><strong>【平均費用：約3,800万～4,900万円】</strong><br>土地付き注文住宅の全国平均費用です。<br><ul><li><strong>メリット：</strong> 建物が古くなっても「土地」という資産が確実に残ります。</li><li><strong>注意点：</strong> 建物の修繕（外壁塗装や屋根修理など）の手配・費用負担はすべて「自己責任」です。また、セキュリティ対策やゴミ当番、町内会などの地域活動も自分たちで行う必要があります。</li></ul></p><p class="source-text" style="font-size:0.8em; color:#666; text-align:right;">～住宅金融支援機構「フラット35利用者調査」等より参照</p>` },
    "H004": { title: "マンション - お手ごろ", type: "house", costsByIncome: { low: 50, mid: 90, high: 150 }, life_point: 25, explanation: `<h3>マンション（新築・中古）</h3><p><strong>【特徴】</strong><br>駅近などの好立地や、高いセキュリティ・断熱性が魅力です。<br>・<strong>新築：</strong> 最新設備と保証が充実していますが、価格は高騰傾向です。<br>・<strong>中古：</strong> 新築より割安で、リノベーションで自由に内装を変えられるのが人気です。ただし、購入前に「管理状態」や「修繕積立金の残高」を確認する必要があります。</p><p><strong>【平均費用】</strong><br>・新築：約5,000万～6,000万円<br>・中古：約3,000万～4,500万円（築年数による）<br>毎月のローンとは別に、管理費・修繕積立金・駐車場代がずっとかかります。</p><p class="source-text" style="font-size:0.8em; color:#666; text-align:right;">～不動産経済研究所、各種市場調査より参照</p>` },
    "H005": { title: "マンション - 標準",   type: "house", costsByIncome: { low: 60, mid: 120, high: 160 }, life_point: 35, explanation: `<h3>マンション（新築・中古）</h3><p><strong>【特徴】</strong><br>駅近などの好立地や、高いセキュリティ・断熱性が魅力です。<br>・<strong>新築：</strong> 最新設備と保証が充実していますが、価格は高騰傾向です。<br>・<strong>中古：</strong> 新築より割安で、リノベーションで自由に内装を変えられるのが人気です。ただし、購入前に「管理状態」や「修繕積立金の残高」を確認する必要があります。</p><p><strong>【平均費用】</strong><br>・新築：約5,000万～6,000万円<br>・中古：約3,000万～4,500万円（築年数による）<br>毎月のローンとは別に、管理費・修繕積立金・駐車場代がずっとかかります。</p><p class="source-text" style="font-size:0.8em; color:#666; text-align:right;">～不動産経済研究所、各種市場調査より参照</p>` },
    "H006": { title: "マンション - 豪華",   type: "house", costsByIncome: { low: 120, mid: 180, high: 250 }, life_point: 55, explanation: `<h3>マンション（新築・中古）</h3><p><strong>【特徴】</strong><br>駅近などの好立地や、高いセキュリティ・断熱性が魅力です。<br>・<strong>新築：</strong> 最新設備と保証が充実していますが、価格は高騰傾向です。<br>・<strong>中古：</strong> 新築より割安で、リノベーションで自由に内装を変えられるのが人気です。ただし、購入前に「管理状態」や「修繕積立金の残高」を確認する必要があります。</p><p><strong>【平均費用】</strong><br>・新築：約5,000万～6,000万円<br>・中古：約3,000万～4,500万円（築年数による）<br>毎月のローンとは別に、管理費・修繕積立金・駐車場代がずっとかかります。</p><p class="source-text" style="font-size:0.8em; color:#666; text-align:right;">～不動産経済研究所、各種市場調査より参照</p>` },
    "H007": { title: "賃貸 - お手ごろ",   type: "house", costsByIncome: { low: 50, mid: 90, high: 150 }, life_point: 10, explanation: `<h3>賃貸</h3><p><strong>【特徴】</strong><br>ライフスタイルの変化（転勤・家族構成の変化）に合わせて気軽に引越しができる「身軽さ」が最大の特徴です。固定資産税や設備の修繕義務がなく、災害時や収入減少時のリスクヘッジがしやすいスタイルです。</p><p><strong>【平均費用：月額 8万～15万円】</strong><br>ファミリー向け（2LDK～3LDK）の家賃相場です。<br>・<strong>生涯コスト：</strong> 購入と異なり資産は残りませんが、50年間家賃を払い続けた場合の総額（約5,000万～8,000万円）は、持ち家の購入・維持費総額と大差ないという試算もあります。</p><p class="source-text" style="font-size:0.8em; color:#666; text-align:right;">～総務省統計局「小売物価統計調査」等より参照</p>` },
    "H008": { title: "賃貸 - 標準",     type: "house", costsByIncome: { low: 60, mid: 120, high: 160 }, life_point: 15, explanation: `<h3>賃貸</h3><p><strong>【特徴】</strong><br>ライフスタイルの変化（転勤・家族構成の変化）に合わせて気軽に引越しができる「身軽さ」が最大の特徴です。固定資産税や設備の修繕義務がなく、災害時や収入減少時のリスクヘッジがしやすいスタイルです。</p><p><strong>【平均費用：月額 8万～15万円】</strong><br>ファミリー向け（2LDK～3LDK）の家賃相場です。<br>・<strong>生涯コスト：</strong> 購入と異なり資産は残りませんが、50年間家賃を払い続けた場合の総額（約5,000万～8,000万円）は、持ち家の購入・維持費総額と大差ないという試算もあります。</p><p class="source-text" style="font-size:0.8em; color:#666; text-align:right;">～総務省統計局「小売物価統計調査」等より参照</p>` },
    "H009": { title: "賃貸 - 豪華",     type: "house", costsByIncome: { low: 120, mid: 180, high: 250 }, life_point: 25, explanation: `<h3>賃貸</h3><p><strong>【特徴】</strong><br>ライフスタイルの変化（転勤・家族構成の変化）に合わせて気軽に引越しができる「身軽さ」が最大の特徴です。固定資産税や設備の修繕義務がなく、災害時や収入減少時のリスクヘッジがしやすいスタイルです。</p><p><strong>【平均費用：月額 8万～15万円】</strong><br>ファミリー向け（2LDK～3LDK）の家賃相場です。<br>・<strong>生涯コスト：</strong> 購入と異なり資産は残りませんが、50年間家賃を払い続けた場合の総額（約5,000万～8,000万円）は、持ち家の購入・維持費総額と大差ないという試算もあります。</p><p class="source-text" style="font-size:0.8em; color:#666; text-align:right;">～総務省統計局「小売物価統計調査」等より参照</p>` },

    "A001": { title: "自動車🚗 - お手ごろクラス", type: "car", costsByIncome: { low: 90, mid: 130, high: 200 }, life_point: 10, explanation: "日常の足として便利な軽自動車やコンパクトカー。" },
    "A002": { title: "自動車🚗 - 標準クラス", type: "car", costsByIncome: { low: 280, mid: 350, high: 450 }, life_point: 20, explanation: "快適なドライブが楽しめるミニバンやSUV。" },
    "A003": { title: "自動車🚗 - ハイクラス", type: "car", costsByIncome: { low: 580, mid: 680, high: 1080 }, life_point: 40, explanation: "走る喜びとステータスを感じる高級輸入車など。" },
    "I001": { title: "生命保険カード", type: "insurance", effect: "年間保険料: 10万円", life_point: 5, explanation: "家族への責任。万一の死亡や高度障害に備えます。" },
    "I002": { title: "火災保険カード", type: "insurance", effect: "年間保険料: 10万円", life_point: 5, explanation: "大切な家を守るお守り。火災だけでなく風水害もカバー。" },
    "I003": { title: "自動車保険カード", type: "insurance", effect: "年間保険料: 6万円", life_point: 5, explanation: "安心して運転するための備え。対人・対物賠償は必須です。" },
    "L001": { title: "子どもの英才教育", type: "life_event_asset_change", effect: "教育資金: 150万円 (一括支出)", life_point: 30, explanation: "子どもの可能性を広げる投資。" },
    "L002": { title: "家族旅行", type: "life_event_asset_change", costsByIncome: { low: 100, mid: 200, high: 300 }, life_point: 25, explanation: "プライスレスな家族の思い出。" },
    "L003": { title: "冠婚葬祭", type: "life_event_asset_change", costsByIncome: { low: 20, mid: 50, high: 80 }, life_point: 5, explanation: "人との繋がりを大切にする義理。" },
    "L004": { title: "交通事故", type: "life_event", effect: "修理・治療費: 200万円 (自動車保険で0円)", life_point: 0, explanation: "予期せぬ事故。お金も心も痛い。" },
    "L005": { title: "家族もしくは本人の怪我", type: "life_event", effect: "治療費: 100万円 (生命保険で0円)", life_point: 0, explanation: "健康の大切さを痛感。" },
    "L006": { title: "病気で入院", type: "life_event", effect: "治療費: 150万円 (生命保険で0円)", life_point: 0, explanation: "予期せぬ入院生活。" },
    "L007": { title: "盗難被害", type: "life_event", effect: "被害額: 100万円 (火災保険で0円)", life_point: 0, explanation: "大切な物を失う悲しみ。" },
    "L008": { title: "装飾品の購入", type: "life_event_asset_change", effect: "購入費用: 50万円 (一括支出)", life_point: 15, explanation: "心がときめく素敵な買い物。" },
    "L009": { title: "自分磨き", type: "life_event_asset_change", costsByIncome: { low: 50, mid: 150, high: 300 }, life_point: 20, explanation: "自分の成長への自己投資。" },
    "L010": { title: "趣味に夢中", type: "life_event_asset_change", costsByIncome: { low: 100, mid: 150, high: 350 }, life_point: 25, explanation: "人生を豊かにする最高の没頭。" },
    "L011": { title: "子どもの結婚", type: "life_event", effect: "援助資金: 100万円 (一括支出)", life_point: 20, explanation: "子どもの門出を祝う親心。" },
    "L012": { title: "子育て世帯特別給付金", type: "social_event", effect: "子どもの人数×10万円を支給", life_point: 5, explanation: "家計に嬉しい臨時収入。" },
    "L013": { title: "深夜2時の「ポチり」事故", type: "life_event", effect: "散財: 30万円", life_point: 5, explanation: "謎の万能感で不要な物を爆買い。" },
    "L014": { title: "推しの「卒業」発表", type: "life_event_asset_change", costsByIncome: { low: 20, mid: 50, high: 100 }, life_point: 50, explanation: "悔いを残さないための全力投資。" },
    "L015": { title: "飼い猫の動画がバズった", type: "life_event", effect: "臨時収入: 30万円", life_point: 10, explanation: "承認欲求とお財布が同時に満たされる、最高の瞬間。" },
    "L016": { title: "サブスクの亡霊", type: "life_event", effect: "固定費削減: 年間-5万円", life_point: 5, explanation: "使っていないジムと動画サイトを解約！" },
    "S001": { title: "好景気発生", type: "social_event", effect: "現ターン中、世帯収入の2割収入アップ", life_point: 5, explanation: "世の中が明るく、気分も上々。" },
    "S002": { title: "不景気発生", type: "social_event", effect: "現ターン中、世帯収入の2割収入ダウン", life_point: 0, explanation: "我慢の時期。" },
    "S003": { title: "インフレ発生", type: "social_event", effect: "一時収入 50万円、一時支出 50万円", life_point: 0, explanation: "物価上昇で生活が変化。" },
    "S004": { title: "新型感染症大流行", type: "social_event", effect: "臨時支出: 50万円 (一括支出)", life_point: 0, explanation: "健康不安と出費。" },
    "S005": { title: "社会保障費増大", type: "social_event", effect: "年間支出が5%増加", life_point: 0, explanation: "将来への負担増。" },
    "S006": { title: "デフレ発生", type: "social_event", effect: "一時収入減 50万円、一時支出減 50万円", life_point: 0, explanation: "経済の停滞。" },
    "S007": { title: "バラマキ政策のツケ（増税）", type: "social_event", effect: "給付金10万円 / 増税", explanation: "特別税が新設されました。" },
    "S008": { title: "転売ヤーの暗躍", type: "social_event", costsByIncome: { low: 5, mid: 15, high: 30 }, effect: "条件付き購入", explanation: "買い占めにより高値で購入。" },
    "S009": { title: "記録的猛暑の到来", type: "social_event", effect: "対象職業に臨時収入", explanation: "猛暑により一部職業に臨時収入。" },
    "S010": { title: "オーバーツーリズムの弊害", type: "social_event", effect: "収入増(過労) or ストレス", explanation: "観光公害により街はパンク状態。" },
    "S011": { title: "レトロブームの到来", type: "social_event", effect: "趣味(L010)の投資額×2倍の収入", explanation: "昔のコレクションが高騰！" },
    "S012": { title: "ステルス値上げ", type: "social_event", costsByIncome: { low: 4, mid: 15, high: 40 }, effect: "実質値上げによる支出増", explanation: "中身が減る実質値上げ。" },
    "T001": { title: "積立投資カード (月5千円)", type: "investment", effect: "年間積立: 6万円", life_point: 0, explanation: "将来のためのコツコツ貯蓄。" },
    "T002": { title: "積立投資カード (月1万円)", type: "investment", effect: "年間積立: 12万円", life_point: 0, explanation: "将来のための標準的な貯蓄。" },
    "T003": { title: "積立投資カード (月2万円)", type: "investment", effect: "年間積立: 24万円", life_point: 0, explanation: "将来を見据えた積極的な貯蓄。" },
    "T004": { title: "積立投資カード (月3万円)", type: "investment", effect: "年間積立: 36万円", life_point: 0, explanation: "老後資金を作る大きな一歩。" },
    "T005": { title: "積立投資カード (月4万円)", type: "investment", effect: "年間積立: 48万円", life_point: 0, explanation: "かなり余裕を持った積立計画。" },
    "T006": { title: "積立投資カード (月5万円)", type: "investment", effect: "年間積立: 60万円", life_point: 0, explanation: "盤石な資産形成への道。" },
    "T007": { title: "一括投資カード (20万円)", type: "investment", effect: "投資金額: 20万円 (一括支出)", life_point: 0, explanation: "余剰資金を運用へ。" },
    "T008": { title: "一括投資カード (50万円)", type: "investment", effect: "投資金額: 50万円 (一括支出)", life_point: 0, explanation: "まとまった資金を運用へ。" },
    "T009": { title: "一括投資カード (70万円)", type: "investment", effect: "投資金額: 70万円 (一括支出)", life_point: 0, explanation: "積極的な資産運用。" },
    "T010": { title: "一括投資カード (100万円)", type: "investment", effect: "投資金額: 100万円 (一括支出)", life_point: 0, explanation: "大きなリターンを目指す投資。" },
    "T011": { title: "一括投資カード (150万円)", type: "investment", effect: "投資金額: 150万円 (一括支出)", life_point: 0, explanation: "資産を大きく育てる投資。" },
    "T012": { title: "一括投資カード (200万円)", type: "investment", effect: "投資金額: 200万円 (一括支出)", life_point: 0, explanation: "最大限の投資効果を狙う。" },
   // --- 退職金: 会社員 (J001) ---
    "R001S": { 
        title: "退職金: 会社員 (少)", type: "retirement", jobId: "J001", amount: 1100, life_point: 10,
        explanation: `<h3>中小企業または転職あり</h3>
<p><strong>【判定：1,100万円】</strong><br>
中小規模の企業での定年退職、または何度か転職を経験した場合の金額です。</p>
<p><strong>【現実のデータ】</strong><br>
東京都の調査によると、中小企業のモデル退職金（大卒・自己都合以外）は<strong>約1,091万円</strong>です。<br>
大企業との格差は約2倍あり、ピーク時と比較しても約300万円減少しています。老後資金としては心許ないため、再雇用での労働が必須となる水準です。</p>
<p class="source-text" style="font-size:0.8em; color:#666; text-align:right;">～東京都産業労働局「中小企業の賃金・退職金事情(令和4年版)」より</p>`
    },
    "R001M": { 
        title: "退職金: 会社員 (普)", type: "retirement", jobId: "J001", amount: 2200, life_point: 15,
        explanation: `<h3>大企業・標準</h3>
<p><strong>【判定：2,200万円】</strong><br>
大企業に新卒から定年まで勤め上げた場合の、最も標準的な金額です。</p>
<p><strong>【現実のデータ】</strong><br>
経団連の調査では、大卒標準者の退職金平均は<strong>2,243万円</strong>です。<br>
「大金だ」と思うかもしれませんが、1997年のピーク時（約2,871万円）と比較すると<strong>約600万円も減少</strong>しています。現役世代の手取りが増えない中、退職金も減り続けているのが日本の現状です。</p>
<p class="source-text" style="font-size:0.8em; color:#666; text-align:right;">～日本経済団体連合会「退職金・年金実態調査結果(2021年)」より</p>`
    },
    "R001H": { 
        title: "退職金: 会社員 (多)", type: "retirement", jobId: "J001", amount: 4000, life_point: 20,
        explanation: `<h3>大企業・役員クラス</h3>
<p><strong>【判定：4,000万円】</strong><br>
大企業で部長・役員クラスまで出世し、功労金が加算された成功者コースです。</p>
<p><strong>【現実のデータ】</strong><br>
一般的な従業員の退職金に、役員としての慰労金が加算されるケースです。<br>
ただし、近年は株主への説明責任（ガバナンス）の観点から、役員退職金を廃止する企業も増えています（2007年の約85%から、現在は約60%以下へ減少）。この金額を受け取れるのは、実力と運を兼ね備えた一握りです。</p>
<p class="source-text" style="font-size:0.8em; color:#666; text-align:right;">～人事院・民間企業退職給付調査などより推計</p>`
    },

    // --- 退職金: 公務員 (J002) ---
    "R002S": { 
        title: "退職金: 公務員 (少)", type: "retirement", jobId: "J002", amount: 1500, life_point: 10,
        explanation: `<h3>勤続年数が短い場合など</h3>
<p><strong>【判定：1,500万円】</strong><br>
自己都合での早期退職や、中途採用などで勤続年数がフル（35年以上）に満たない場合です。</p>
<p><strong>【現実のデータ】</strong><br>
公務員の退職金は「勤続年数」が命です。定年まで勤めれば約2,100万円ですが、例えば勤続25年程度で早期退職すると、支給率は大きく下がります。<br>
それでも民間の中小企業平均よりは高い水準が保証されています。</p>
<p class="source-text" style="font-size:0.8em; color:#666; text-align:right;">～内閣官房「国家公務員退職手当実態調査」より</p>`
    },
    "R002M": { 
        title: "退職金: 公務員 (普)", type: "retirement", jobId: "J002", amount: 2100, life_point: 15,
        explanation: `<h3>定年退職（標準）</h3>
<p><strong>【判定：2,100万円】</strong><br>
新卒から定年まで勤め上げた、公務員の王道パターンです。</p>
<p><strong>【現実のデータ】</strong><br>
国家公務員（行政職）の定年退職金平均は<strong>約2,106万円</strong>です。<br>
かつては3,000万円近くありましたが、「官民格差」を是正するために民間企業（大企業）の水準に合わせて約10年ごとに引き下げ改定が行われています。それでも、倒産リスクがなく確実に貰える点は最強のメリットです。</p>
<p class="source-text" style="font-size:0.8em; color:#666; text-align:right;">～内閣官房「退職手当の支給状況(令和4年度)」より</p>`
    },
    "R002H": { 
        title: "退職金: 公務員 (多)", type: "retirement", jobId: "J002", amount: 2500, life_point: 20,
        explanation: `<h3>事務次官・局長級</h3>
<p><strong>【判定：2,500万円】</strong><br>
激務に耐え、本省の局長や事務次官などの指定職まで上り詰めた場合です。</p>
<p><strong>【現実のデータ】</strong><br>
指定職（幹部）の平均退職金額は、一般職より高く設定されています。<br>
ただし、いわゆる「天下り」規制が厳しくなったため、退職後の渡り歩きによる生涯収入は昔ほど青天井ではありません。純粋に現役時代の激務への対価と言えます。</p>
<p class="source-text" style="font-size:0.8em; color:#666; text-align:right;">～内閣官房「国家公務員退職手当実態調査」指定職データより</p>`
    },

    // --- 退職金: 料理人 (J003) ---
    "R003S": { 
        title: "退職金: 料理人 (少)", type: "retirement", jobId: "J003", amount: 0, life_point: 5,
        explanation: `<h3>個人店・小規模店</h3>
<p><strong>【判定：0万円】</strong><br>
退職金制度のない個人経営の店舗に勤務していた場合です。</p>
<p><strong>【現実のデータ】</strong><br>
飲食業界（特に小規模事業者）では、退職金制度がある企業は<strong>全体の30%以下</strong>とも言われます。<br>
この職業を選んだ場合、現役時代の給与から自分で「iDeCo」などで積み立てておかないと、老後資金がゼロになるリスクと隣り合わせです。</p>
<p class="source-text" style="font-size:0.8em; color:#666; text-align:right;">～厚生労働省「就労条件総合調査」宿泊・飲食サービス業データより</p>`
    },
    "R003M": { 
        title: "退職金: 料理人 (普)", type: "retirement", jobId: "J003", amount: 500, life_point: 10,
        explanation: `<h3>中堅チェーン・独立資金</h3>
<p><strong>【判定：500万円】</strong><br>
中規模の飲食企業に勤務、あるいは独立開業のために貯めた自己資金です。</p>
<p><strong>【現実のデータ】</strong><br>
飲食業界の平均退職金は、全産業平均と比べても著しく低く、勤続20年以上でも<strong>300万～500万円程度</strong>に留まることが多いです。<br>
退職金を「老後資金」ではなく「自分の店を持つための開業資金」として使う人が多いのもこの職業の特徴です。</p>
<p class="source-text" style="font-size:0.8em; color:#666; text-align:right;">～中央労働委員会「賃金事情等総合調査」より</p>`
    },
    "R003H": { 
        title: "退職金: 料理人 (多)", type: "retirement", jobId: "J003", amount: 1500, life_point: 15,
        explanation: `<h3>大手ホテル・総料理長</h3>
<p><strong>【判定：1,500万円】</strong><br>
福利厚生が整った大手ホテルや、上場外食企業の幹部料理長として勤め上げた場合です。</p>
<p><strong>【現実のデータ】</strong><br>
「料理人」といっても勤務先が大手ホテルチェーンであれば、一般的な会社員と同等の退職金制度が適用されます。<br>
腕一本でここまで登り詰めるには、技術だけでなくマネジメント能力も必要とされたはずです。</p>
<p class="source-text" style="font-size:0.8em; color:#666; text-align:right;">～各種ホテル業界給与データより推計</p>`
    },

    // --- 退職金: 保育士 (J004) ---
    "R004S": { 
        title: "退職金: 保育士 (少)", type: "retirement", jobId: "J004", amount: 300, life_point: 5,
        explanation: `<h3>私立園（小規模）</h3>
<p><strong>【判定：300万円】</strong><br>
小規模な社会福祉法人が運営する園で、退職金共済のみの支給の場合です。</p>
<p><strong>【現実のデータ】</strong><br>
私立保育園の場合、園独自の制度はなく、福祉医療機構の「退職手当共済」のみというケースが多々あります。<br>
この場合、30年勤続しても受取額は<strong>約600万円以下</strong>になることが多く、公立保育士との格差（官民格差）が大きな問題となっています。</p>
<p class="source-text" style="font-size:0.8em; color:#666; text-align:right;">～福祉医療機構「退職手当共済事業」給付実績より</p>`
    },
    "R004M": { 
        title: "退職金: 保育士 (普)", type: "retirement", jobId: "J004", amount: 900, life_point: 10,
        explanation: `<h3>私立園（中堅・制度あり）</h3>
<p><strong>【判定：900万円】</strong><br>
退職金制度が整備された私立園で、園長クラスまで勤めた場合です。</p>
<p><strong>【現実のデータ】</strong><br>
私立でも、複数の園を運営する大規模法人などでは独自の上乗せ制度がある場合があります。<br>
それでも全産業平均（約1,100万〜2,200万）と比較すると低い水準にあり、現役時代の「処遇改善手当」をいかに貯蓄に回せたかが重要になります。</p>
<p class="source-text" style="font-size:0.8em; color:#666; text-align:right;">～厚生労働省「幼稚園・保育所等の経営実態調査」より</p>`
    },
    "R004H": { 
        title: "退職金: 保育士 (多)", type: "retirement", jobId: "J004", amount: 2100, life_point: 15,
        explanation: `<h3>公立保育士（公務員）</h3>
<p><strong>【判定：2,100万円】</strong><br>
公立保育園に採用され、地方公務員として定年まで勤め上げた場合です。</p>
<p><strong>【現実のデータ】</strong><br>
公立保育士は身分が「地方公務員」であるため、退職金も<strong>公務員規定（約2,100万円）</strong>が適用されます。<br>
同じ仕事内容でも、勤務先が公立か私立かで老後資金に1,000万円以上の差がつくのが、保育業界の隠れた実態です。</p>
<p class="source-text" style="font-size:0.8em; color:#666; text-align:right;">～総務省「地方公務員給与実態調査」より</p>`
    },

    // --- 退職金: 医師 (J005) ---
    "R005S": { 
        title: "退職金: 医師 (少)", type: "retirement", jobId: "J005", amount: 500, life_point: 10,
        explanation: `<h3>開業医の閉院・転院</h3>
<p><strong>【判定：500万円】</strong><br>
勤務医として病院を渡り歩いた（勤続年数が分散した）、または開業医が小規模で閉院した場合です。</p>
<p><strong>【現実のデータ】</strong><br>
医師は高給ですが、退職金制度は意外と手薄です。<br>
開業医にはそもそも退職金がなく、「小規模企業共済」などで自ら積み立てる必要があります。また、勤務医も転職が多ければ退職金はほとんど積み上がりません。現役時代の高収入をどれだけ投資に回せたかが勝負です。</p>
<p class="source-text" style="font-size:0.8em; color:#666; text-align:right;">～医師のキャリア調査データ等より</p>`
    },
    "R005M": { 
        title: "退職金: 医師 (普)", type: "retirement", jobId: "J005", amount: 1800, life_point: 15,
        explanation: `<h3>勤務医（部長クラス）</h3>
<p><strong>【判定：1,800万円】</strong><br>
民間の中核病院などで、定年まで勤務医として勤め上げた場合です。</p>
<p><strong>【現実のデータ】</strong><br>
医療法人の退職金は、一般企業の水準に準じることが多いです。<br>
平均年収が1,500万円近い医師にとって、退職金2,000万円弱というのは「年収のわずか1.5年分」に過ぎません（会社員は年収の4〜5年分）。医師にとって退職金はメインの資産形成手段ではないのです。</p>
<p class="source-text" style="font-size:0.8em; color:#666; text-align:right;">～中央社会保険医療協議会「医療経済実態調査」より</p>`
    },
    "R005H": { 
        title: "退職金: 医師 (多)", type: "retirement", jobId: "J005", amount: 3500, life_point: 20,
        explanation: `<h3>院長・公立病院幹部</h3>
<p><strong>【判定：3,500万円】</strong><br>
大規模病院の院長職、またはクリニックを高値で事業承継（M&A）できた場合です。</p>
<p><strong>【現実のデータ】</strong><br>
公立病院の院長クラスであれば、公務員規定＋役職加算で高額になります。<br>
また、開業医が引退時に「医療法人」を後継者に売却できた場合、その譲渡益が事実上の退職金（ハッピーリタイアメント）となり、数千万円〜億単位になることもあります。</p>
<p class="source-text" style="font-size:0.8em; color:#666; text-align:right;">～医療M&A市場データ、公立病院給与規定より</p>`
    },

    // --- 退職金: 看護師 (J006) ---
    "R006S": { 
        title: "退職金: 看護師 (少)", type: "retirement", jobId: "J006", amount: 500, life_point: 10,
        explanation: `<h3>クリニック・介護施設</h3>
<p><strong>【判定：500万円】</strong><br>
小規模な個人クリニックや、訪問看護ステーションなどに勤務した場合です。</p>
<p><strong>【現実のデータ】</strong><br>
看護師は流動性が高く（転職が多い）、退職金制度のない小規模事業所も多いため、退職金の平均額は全職種平均よりも低い傾向にあります。<br>
勤続年数がリセットされやすいため、1,000万円を超える退職金を受け取る看護師は全体の数%と言われています。</p>
<p class="source-text" style="font-size:0.8em; color:#666; text-align:right;">～日本看護協会「病院看護実態調査」より</p>`
    },
    "R006M": { 
        title: "退職金: 看護師 (普)", type: "retirement", jobId: "J006", amount: 1200, life_point: 15,
        explanation: `<h3>私立総合病院（師長）</h3>
<p><strong>【判定：1,200万円】</strong><br>
ある程度の規模がある私立病院で、看護師長クラスまで勤め上げた場合です。</p>
<p><strong>【現実のデータ】</strong><br>
民間の大規模病院における看護職のモデル退職金は<strong>約1,000万〜1,200万円</strong>です。<br>
夜勤という身体的負担の大きい業務を何十年も続け、管理職の責任も負った対価としては「決して多くはない」と感じる現場の声も多い金額です。</p>
<p class="source-text" style="font-size:0.8em; color:#666; text-align:right;">～医療経済実態調査データより</p>`
    },
    "R006H": { 
        title: "退職金: 看護師 (多)", type: "retirement", jobId: "J006", amount: 2100, life_point: 20,
        explanation: `<h3>公立・国立病院</h3>
<p><strong>【判定：2,100万円】</strong><br>
国立病院機構や県立病院などに勤務し、公務員（準公務員）扱いとなった場合です。</p>
<p><strong>【現実のデータ】</strong><br>
ここでも「公務員規定」の強さが発揮されます。<br>
国公立の病院であれば、看護師も公務員給与表に基づいて退職金が計算されるため、民間病院と比べて圧倒的に有利になります。安定を求めるなら国公立一択と言われる所以です。</p>
<p class="source-text" style="font-size:0.8em; color:#666; text-align:right;">～人事院・公務員給与規定より</p>`
    },

    // --- 退職金: 美容師 (J007) ---
    "R007S": { 
        title: "退職金: 美容師 (少)", type: "retirement", jobId: "J007", amount: 0, life_point: 5,
        explanation: `<h3>業界標準</h3>
<p><strong>【判定：0万円】</strong><br>
美容業界では「退職金制度なし」が一般的です。</p>
<p><strong>【現実のデータ】</strong><br>
美容室の9割は個人経営などの小規模事業者であり、退職金制度があるサロンは極めて稀です。<br>
この職業を選んだ場合、国民年金だけでは老後生活が破綻するため、若いうちから「iDeCo」や「国民年金基金」への加入が必須と言われる、自助努力の業界です。</p>
<p class="source-text" style="font-size:0.8em; color:#666; text-align:right;">～厚生労働省「生活衛生関係営業経営実態調査」より</p>`
    },
    "R007M": { 
        title: "退職金: 美容師 (普)", type: "retirement", jobId: "J007", amount: 200, life_point: 10,
        explanation: `<h3>中堅サロン（寸志）</h3>
<p><strong>【判定：200万円】</strong><br>
法人化している中堅サロンで、長年貢献したことへの「功労金」的な意味合いです。</p>
<p><strong>【現実のデータ】</strong><br>
退職金制度があるサロンでも、その額は数十万〜200万円程度に留まるケースが多いです。<br>
美容師は「ハサミ一本で稼ぐ個人事業主」に近い性質があるため、会社に守ってもらうというより、自分の腕と指名客という資産を作ることが最大の退職金代わりとなります。</p>
<p class="source-text" style="font-size:0.8em; color:#666; text-align:right;">～理美容業界年鑑データ等より</p>`
    },
    "R007H": { 
        title: "退職金: 美容師 (多)", type: "retirement", jobId: "J007", amount: 500, life_point: 15,
        explanation: `<h3>大手チェーン幹部</h3>
<p><strong>【判定：500万円】</strong><br>
全国展開する大手サロンチェーンの幹部や教育担当としてキャリアを終えた場合です。</p>
<p><strong>【現実のデータ】</strong><br>
上場しているような大手美容企業であれば、企業年金や退職金制度が整備されつつあります。<br>
それでも他業界と比較すると少なめですが、業界内では非常に恵まれた「勝ち組」の待遇と言えます。</p>
<p class="source-text" style="font-size:0.8em; color:#666; text-align:right;">～各社有価証券報告書より推計</p>` },
    "RT_S": { title: "退職金カード (少)", type: "retirement_trigger", level: "S", life_point: 0, explanation: "「少ない」退職金を受け取ります。" },
    "RT_M": { title: "退職金カード (普)", type: "retirement_trigger", level: "M", life_point: 0, explanation: "「普通」の退職金を受け取ります。" },
    "RT_H": { title: "退職金カード (多)", type: "retirement_trigger", level: "H", life_point: 0, explanation: "「多い」退職金を受け取ります。" }
};
// ▼▼▼ 追加: 転職成功確率設定 (10段階) ▼▼▼
// 10 = 10/10 (100%成功), 1 = 1/10 (10%成功)
const JOB_SUCCESS_RATE = {
    "J005": 1,  // 医師: 最難関 (10%)
    "J002": 3,  // 公務員: 難 (30%)
    "J006": 5,  // 看護師: 難 (50%)
    "J001": 5,  // 会社員: 普通 (50%)
    "J003": 5,  // 料理人: 普通 (50%)
    "J004": 6,  // 保育士: やや易 (60%)
    "J007": 5,  // 美容師: やや易 (50%)
    "J008": 10, // フリーター: 確実 (100%)
    "J009": 10, // パート: 確実 (100%)
    "J010": 10  // 専業主婦: 確実 (100%)
};

// ==========================================================
// 2. ゲームの状態管理 & 定数
// ==========================================================
const infoButtonStyle = "display:inline-block; margin-top:15px; font-size:1.1em; padding:12px 25px; background: linear-gradient(135deg, #4facfe 0%, #00f2fe 100%); color: white; border: none; border-radius: 25px; box-shadow: 0 4px 10px rgba(79, 172, 254, 0.4); font-weight: bold; cursor: pointer;";

let gameState = {
    isRouletteSpinning: false,
    myPlayerId: null, lastProcessedEventTimestamp: 0, currentAge: 30,
    players: { player1: { name: '', job: '', income: 0, grossIncome: 0, jobId: null, needsNewJob: false, promotionSuccess: false }, player2: { name: '', job: '', income: 0, grossIncome: 0, jobId: null, needsNewJob: false, promotionSuccess: false } },
    totalAssets: 100, happiness: 0, annualExpense: 0,
    marriage: { type: '-', cost: 0, cardScanned: false },
    children: { count: 0, annualCost: 0, cardId: null, cardScanned: false }, 
    house: { type: '-', annualCost: 0, cardId: null, cardScanned: false },
    car: { cards: [], annualCost: 0, cardScanned: false },
    insurance: { life: false, fire: false, auto: false, annualCost: 0, cardScanned: false },
    investment: { tsumitateTotal: 0, ikkatsuTotal: 0, tsumitateLog: [], ikkatsuLog: [] },
    events: [], livingCost: 0, socialTax: 0, subscriptionSavings: 0, scannedCards: [], balanceHistory: [], 
    isCareerChallengeActive: false, currentPlayerChallenge: null, currentGuidance: null, guidanceContextForApply: null, turnEventCompleted: false, tempDeductions: null, finalInvestmentResult: null, tempInvestmentResult: null,
    turnExpenses: { marriage: 0, car: 0, life_event: 0, social_event: 0, investment_ikkatsu: 0 },
    retirementBonus: { player1: 0, player2: 0, p1Scanned: false, p2Scanned: false }, lastTurnData: null 
};

let familyMakeState = { step: 0, p1Name: '', p2Name: '', p1JobId: 'J001', p2JobId: 'J001', marriageId: 'M001', childCount: 0, houseType: 0, houseLevel: 0, houseId: 'H001' };

const GAME_STATE_KEY = 'lifeGameGameState';
const BALANCE_HISTORY_KEY = 'lifeGameBalanceHistory';
const HALL_OF_FAME_KEY = 'lifeGameHallOfFame'; 

let cameraStream = null;
let scanning = false;
let animationFrameId = null;
let lastScannedCardId = null;
let finalBalanceChartInstance = null;
let rouletteInterval = null; 
let isRouletteRunning = false;
let counterAnimationId = null; 

// ★★★ 子どもルーレット専用の変数 ★★★
let childRouletteInterval = null;
let isChildRouletteRunning = false;

// ==========================================================
// 3. ヘルパー関数
// ==========================================================

function getNetIncomeDetails(grossIncome) {
    let net = 0;
    if (grossIncome <= 2000) net = Math.round(grossIncome * 0.64);
    if (grossIncome <= 1000) net = Math.round(grossIncome * 0.735);
    if (grossIncome <= 600) net = Math.round(grossIncome * 0.77);
    if (grossIncome <= 400) net = Math.round(grossIncome * 0.80);
    const totalDeduction = grossIncome - net;
    const deductions = { 
        health: Math.round(totalDeduction * 0.4), 
        pension: Math.round(totalDeduction * 0.4), 
        employment: Math.round(totalDeduction * 0.05), 
        incomeTax: Math.round(totalDeduction * 0.1), 
        residentTax: Math.round(totalDeduction * 0.05),
        total: totalDeduction
    };
    if(typeof gameState !== 'undefined') gameState.tempDeductions = deductions;
    return { net, totalDeduction, deductions };
}

function parseNumber(effect) {
    if (!effect) return 0;
    const match = effect.match(/(\d+)/); 
    return match ? parseInt(match[1], 10) : 0;
}

function calcTurnDuration(age) {
    if (age === 60) return 5;
    if (age >= 70) return 0;
    return 10;
}

function startTurnIncomeAndExpense(age) {
    const duration = calcTurnDuration(age);
    if (duration <= 0) return;
    const annualIncome = (gameState.players.player1.income || 0) + (gameState.players.player2.income || 0);
    const annualFixedExpense = gameState.annualExpense;
    
    // 期間収支の計算
    const periodNetFlow = (annualIncome - annualFixedExpense) * duration;
    gameState.totalAssets += periodNetFlow;
    
    // --- イベントログ詳細化 ---
    const totalIncome = annualIncome * duration;
    const totalFixed = annualFixedExpense * duration;
    
    addEvent(`--- ${age}代スタート (${duration}年間) ---`);
    addEvent(`収入: +${totalIncome.toLocaleString()}万円 (世帯年収${annualIncome}万×${duration}年)`);
    
    let expenseDetails = [];
    if(gameState.house.annualCost > 0) expenseDetails.push(`住居:${gameState.house.annualCost}万`);
    if(gameState.children.annualCost > 0) expenseDetails.push(`教育:${gameState.children.annualCost}万`);
    if(gameState.car.annualCost > 0) expenseDetails.push(`車維持:${gameState.car.annualCost}万`);
    if(gameState.insurance.annualCost > 0) expenseDetails.push(`保険:${gameState.insurance.annualCost}万`);
    if(gameState.livingCost > 0) expenseDetails.push(`生活費:${gameState.livingCost}万`);
    
    addEvent(`固定費: -${totalFixed.toLocaleString()}万円`);
    if(expenseDetails.length > 0) addEvent(`(年内訳: ${expenseDetails.join(', ')})`);
    
    addEvent(`期間収支: ${periodNetFlow > 0 ? '+' : ''}${periodNetFlow.toLocaleString()}万円`);
}

// ★★★ ガイダンス画面での資産表示パネル生成 ★★★
function createGuidanceStats(assetValue) {
    const panelContainer = document.getElementById('guidance-asset-panel-container');
    if(panelContainer) {
        // デザイン復旧: style.cssの .guidance-asset-panel-style を適用し、枠と単位を表示
        panelContainer.innerHTML = `
            <div class="guidance-asset-panel-style">
                <div style="font-size:0.9em; color:#ccc;">現在の総資産</div>
                <div style="font-size:2.5em; font-weight:bold; color:#FFD700; font-family:monospace; line-height:1.2;">
                    <span class="guidance-asset-value" id="guidanceAssetValue">${Math.round(assetValue).toLocaleString()}</span>
                    <span style="font-size:0.6em; color:white;">万円</span>
                </div>
                <div id="guidanceAssetDiff" style="height:30px; font-weight:bold; font-size:1.5em; margin-top:5px; opacity:0;"></div>
            </div>
        `;
    }
}

// カメラ画面用サブ画面HTMLの生成（動的挿入）
function createScanOverlay() {
    const existing = document.getElementById('scanStatsPanel');
    if (existing) existing.remove();

    const panel = document.createElement('div');
    panel.id = 'scanStatsPanel';
    panel.style.cssText = `
        background: #333; color: white; padding: 15px; text-align: center;
        border-top: 3px solid #FFD700; width: 100%; box-sizing: border-box;
        margin-top: 10px; border-radius: 0 0 15px 15px;
    `;
    
    panel.innerHTML = `
        <div style="font-size:0.9em; color:#ccc;">現在の総資産</div>
        <div style="font-size:2em; font-weight:bold; color:#FFD700; font-family:monospace;">
            <span id="scanAssetValue">${Math.round(gameState.totalAssets).toLocaleString()}</span>
            <span style="font-size:0.6em; color:white;">万円</span>
        </div>
        <div id="scanAssetDiff" style="height:30px; font-weight:bold; font-size:1.5em; margin-top:5px;"></div>
    `;
    
    const cameraModalContent = document.querySelector('#cameraModal .modal-content');
    if (cameraModalContent) {
        const cameraView = cameraModalContent.querySelector('.camera-view');
        if (cameraView) {
            cameraView.insertAdjacentElement('afterend', panel);
        } else {
            cameraModalContent.appendChild(panel);
        }
    }
}

// LPカウンター風アニメーション (ID指定で汎用化)
function animateValue(id, start, end, duration) {
    const obj = document.getElementById(id);
    if (!obj) return;
    const range = end - start;
    if (range === 0) return;
    let startTime = null;
    
    function step(timestamp) {
        if (!startTime) startTime = timestamp;
        const progress = Math.min((timestamp - startTime) / duration, 1);
        const ease = 1 - Math.pow(1 - progress, 3);
        obj.innerHTML = Math.floor(start + (range * ease)).toLocaleString();
        if (progress < 1) {
            window.requestAnimationFrame(step);
        } else {
            obj.innerHTML = end.toLocaleString();
        }
    }
    window.requestAnimationFrame(step);
}

// 資産変動アニメーション（ラッパー）
function animateAssetChange(startVal, endVal) {
    // 差分表示
    const diff = endVal - startVal;
    if (diff === 0) return;
    
    // ガイダンス画面が開いていればそちらをアニメーション
    const guideDiff = document.getElementById('guidanceAssetDiff');
    if (guideDiff && document.getElementById('guidanceModal').style.display !== 'none') {
        guideDiff.textContent = (diff > 0 ? "+" : "") + diff.toLocaleString() + "万円";
        guideDiff.style.color = diff > 0 ? "#48bb78" : "#f56565"; 
        guideDiff.style.opacity = '1';
        setTimeout(() => { if(guideDiff) guideDiff.style.opacity = '0'; }, 3000);
        animateValue("guidanceAssetValue", startVal, endVal, 1500);
    }

    // カメラ画面（サブ画面）が開いていればそちらをアニメーション
    const scanDiff = document.getElementById('scanAssetDiff');
    if (scanDiff && document.getElementById('cameraModal').style.display !== 'none') {
        scanDiff.textContent = (diff > 0 ? "+" : "") + diff.toLocaleString() + "万円";
        scanDiff.style.color = diff > 0 ? "#48bb78" : "#f56565"; 
        scanDiff.style.opacity = '1';
        setTimeout(() => { if(scanDiff) scanDiff.style.opacity = '0'; }, 3000);
        animateValue("scanAssetValue", startVal, endVal, 1500);
    }
}

// ==========================================================
// 4. ファミリーメイク & 初期化
// ==========================================================
function getTempHouseholdGross() {
    const id1 = familyMakeState.p1JobId || 'J001';
    const id2 = familyMakeState.p2JobId || 'J001';
    const salary1 = CARD_DATA[id1] ? CARD_DATA[id1].salary[30] : 0;
    const salary2 = CARD_DATA[id2] ? CARD_DATA[id2].salary[30] : 0;
    return salary1 + salary2;
}

function getCostRank(gross) {
    if (gross < 600) return 'low';
    if (gross < 1000) return 'mid';
    return 'high';
}

// 【修正版】startFamilyMake 関数
function startFamilyMake() {
    const roomId = document.getElementById('roomIdInput').value;
    if (database && !roomId) { alert("ルームIDを入力すると他プレイヤーとイベント共有ができます"); }
    
    currentRoomId = roomId;
    
    if (database && currentRoomId) {
        // ★重要修正: ルーム接続時に「現在時刻」をセットし、これより古い過去イベントを即座に無視する
        gameState.lastProcessedEventTimestamp = Date.now();

        const eventRef = database.ref('rooms/' + currentRoomId + '/globalEvent');
        eventRef.on('value', (snapshot) => {
            const eventData = snapshot.val();
            if (eventData) {
                // 基準時刻より古い（過去の）イベントなら無視
                if (eventData.timestamp <= (gameState.lastProcessedEventTimestamp || 0)) return; 
                if (eventData.senderId === gameState.myPlayerId) return;
                
                const card = CARD_DATA[eventData.cardId];
                if (card) {
                    // 受信したイベントの時刻で基準を更新
                    gameState.lastProcessedEventTimestamp = eventData.timestamp;
                    alert(`【社会情勢イベント受信】\n他のプレイヤーが「${card.title}」を発生させました！\nあなたの家計にも影響が発生します。`);
                    applyCardEffect(eventData.cardId, true);
                }
            }
        });
    }
    
    const ts = document.getElementById('titleScreen');
    const fs = document.getElementById('familyMakeScreen');
    if(ts) ts.style.display = 'none';
    if(fs) fs.style.display = 'block';
    familyMakeState.step = 0;
    renderMakeStep();
}

function showLocalExplanation(cardId, directHtml = null) {
    let explanationText = '解説はありません。';
    if (directHtml) { explanationText = directHtml.replace(/\n/g, '<br>'); } 
    else if (cardId && CARD_DATA[cardId]) {
        const card = CARD_DATA[cardId];
        if (card.explanation) { explanationText = card.explanation.replace(/\n/g, '<br>'); }
    }
    const explanationEl = document.getElementById('card-explanation');
    const modalEl = document.getElementById('explanationModal');
    if (explanationEl && modalEl) { explanationEl.innerHTML = explanationText; modalEl.style.display = 'flex'; }
}

function renderMakeStep() {
    const contentArea = document.getElementById('makeContentArea');
    const titleEl = document.getElementById('makeStepTitle');
    const descEl = document.getElementById('makeStepDesc');
    const nextBtn = document.getElementById('makeNextBtn');
    
    if (!nextBtn) return;

    nextBtn.style.display = 'inline-block';
    contentArea.innerHTML = ''; 
    
    const currentGross = getTempHouseholdGross();
    const rank = getCostRank(currentGross);
    const rankText = rank === 'low' ? '～600万' : (rank === 'mid' ? '600～1000万' : '1000万～');

    switch(familyMakeState.step) {
        case 0:
            titleEl.textContent = "プレイヤー1の作成";
            descEl.textContent = "あなたの名前と職業を選んでください。";
            contentArea.innerHTML += `<div class="make-input-group"><label>プレイヤー1の名前</label><input type="text" id="makeP1Name" value="${familyMakeState.p1Name || 'プレイヤー1'}" placeholder="名前を入力"></div>`;
            createSlider(contentArea, 'job', 'J001', 'p1JobId');
            break;
        case 1:
            titleEl.textContent = "プレイヤー2の作成";
            descEl.textContent = "パートナーの名前と職業を選んでください。";
            contentArea.innerHTML += `<div class="make-input-group"><label>プレイヤー2の名前</label><input type="text" id="makeP2Name" value="${familyMakeState.p2Name || 'プレイヤー2'}" placeholder="名前を入力"></div>`;
            createSlider(contentArea, 'job', 'J001', 'p2JobId');
            break;
        case 2:
            titleEl.textContent = "結婚式のスタイル";
            descEl.innerHTML = `理想の結婚式を選んでください。<br><small style="color:#e53e3e;">現在の世帯年収(30代予測): ${currentGross}万円</small>`;
            createSlider(contentArea, 'marriage', 'M001', 'marriageId');
            break;
        case 3:
            // ★★★ ルーレット修正：状態リセットを確実に行う ★★★
            isChildRouletteRunning = false;
            if(childRouletteInterval) clearInterval(childRouletteInterval);

            titleEl.textContent = "子どもの人数";
            descEl.innerHTML = `子どもは授かりもの。ルーレットで決めましょう！<br><small style="color:#e53e3e;">世帯年収ランク: ${rankText}</small>`;
            
            contentArea.innerHTML += `
                <div class="child-roulette-display" id="childRouletteNum">1</div>
                <div id="childResultContainer" style="display:none; margin-bottom: 20px;">
                    <p id="childResultText" style="font-size: 1.5em; font-weight:bold; color:#FF7F50; margin-bottom:5px;"></p>
                    <p id="childCostText" style="font-size: 1.2em; font-weight:bold; color:#e53e3e; margin-bottom:10px;"></p>
                    <img id="childResultImg" src="" alt="子供イラスト" style="max-width:250px; height:auto; border-radius:15px; box-shadow:0 4px 10px rgba(0,0,0,0.1);">
                </div>
                <button id="childRouletteBtn" class="btn-primary" onclick="toggleChildRoulette()" style="width: 200px;"><i class="fas fa-play"></i> スタート</button>
            `;
            nextBtn.style.display = 'none'; 
            break;
        case 4:
            titleEl.textContent = "住宅の種類";
            descEl.textContent = "どんな家に住みたいですか？";
            createSimpleSlider(contentArea, [
                { 
                    id: 0, title: "一戸建て", image: "一軒家.jpg", desc: "夢のマイホーム",
                    explanation: `<h3>一戸建て</h3><p><strong>【特徴】</strong><br>独立性が高く、上下階の騒音トラブルを気にせず子育てができます。駐車場代がかからないことが多く、庭を持てるのも魅力です。</p><p><strong>【平均費用：約3,800万～4,900万円】</strong><br>土地付き注文住宅の全国平均費用です。<br><ul><li><strong>メリット：</strong> 建物が古くなっても「土地」という資産が確実に残ります。</li><li><strong>注意点：</strong> 建物の修繕（外壁塗装や屋根修理など）の手配・費用負担はすべて「自己責任」です。また、セキュリティ対策やゴミ当番、町内会などの地域活動も自分たちで行う必要があります。</li></ul></p><p class="source-text" style="font-size:0.8em; color:#666; text-align:right;">～住宅金融支援機構「フラット35利用者調査」等より参照</p>`
                },
                { 
                    id: 1, title: "マンション", image: "マンション.jpg", desc: "便利な集合住宅",
                    explanation: `<h3>マンション（新築・中古）</h3><p><strong>【特徴】</strong><br>駅近などの好立地や、高いセキュリティ・断熱性が魅力です。<br>・<strong>新築：</strong> 最新設備と保証が充実していますが、価格は高騰傾向です。<br>・<strong>中古：</strong> 新築より割安で、リノベーションで自由に内装を変えられるのが人気です。ただし、購入前に「管理状態」や「修繕積立金の残高」を確認する必要があります。</p><p><strong>【平均費用】</strong><br>・新築：約5,000万～6,000万円<br>・中古：約3,000万～4,500万円（築年数による）<br>毎月のローンとは別に、管理費・修繕積立金・駐車場代がずっとかかります。</p><p class="source-text" style="font-size:0.8em; color:#666; text-align:right;">～不動産経済研究所、各種市場調査より参照</p>`
                },
                { 
                    id: 2, title: "賃貸", image: "賃貸.jpg", desc: "気楽な住まい",
                    explanation: `<h3>賃貸</h3><p><strong>【特徴】</strong><br>ライフスタイルの変化（転勤・家族構成の変化）に合わせて気軽に引越しができる「身軽さ」が最大の特徴です。固定資産税や設備の修繕義務がなく、災害時や収入減少時のリスクヘッジがしやすいスタイルです。</p><p><strong>【平均費用：月額 8万～15万円】</strong><br>ファミリー向け（2LDK～3LDK）の家賃相場です。<br>・<strong>生涯コスト：</strong> 購入と異なり資産は残りませんが、50年間家賃を払い続けた場合の総額（約5,000万～8,000万円）は、持ち家の購入・維持費総額と大差ないという試算もあります。</p><p class="source-text" style="font-size:0.8em; color:#666; text-align:right;">～総務省統計局「小売物価統計調査」等より参照</p>`
                }
            ], familyMakeState.houseType, 'houseType');
            break;
        case 5:
            titleEl.textContent = "住宅の価格帯";
            descEl.innerHTML = `ご予算はどれくらいにしますか？<br><small style="color:#e53e3e;">現在の世帯年収(30代予測): ${currentGross}万円</small>`;
            createSimpleSlider(contentArea, [
                { id: 0, title: "お手ごろ", icon: "fa-coins", desc: "リーズナブル" },
                { id: 1, title: "標準的", icon: "fa-balance-scale", desc: "一般的" },
                { id: 2, title: "豪華", icon: "fa-gem", desc: "ハイグレード" }
            ], familyMakeState.houseLevel, 'houseLevel');
            nextBtn.innerHTML = '生活スタート <i class="fas fa-check"></i>';
            break;
    }
}

function createSlider(container, type, defaultId, stateKey) {
    const sliderContainer = document.createElement('div');
    sliderContainer.className = 'slider-container';
    const items = Object.keys(CARD_DATA).filter(k => CARD_DATA[k].type === type).map(k => ({id: k, ...CARD_DATA[k]}));
    let currentIndex = items.findIndex(i => i.id === (familyMakeState[stateKey] || defaultId));
    if (currentIndex === -1) currentIndex = 0;

    const prevBtn = document.createElement('button');
    prevBtn.className = 'slider-btn';
    prevBtn.innerHTML = '<i class="fas fa-chevron-left"></i>';
    const cardEl = document.createElement('div');
    cardEl.className = 'selection-card active';
    const infoEl = document.createElement('div');
    infoEl.className = 'selection-info';
    infoEl.style.marginTop = "10px";
    infoEl.style.fontWeight = "bold";
    infoEl.style.color = "#2d3748";
    
    const nextBtn = document.createElement('button');
    nextBtn.className = 'slider-btn';
    nextBtn.innerHTML = '<i class="fas fa-chevron-right"></i>';

    function updateCard() {
        const item = items[currentIndex];
        familyMakeState[stateKey] = item.id;
        let visual = item.image ? `<img src="${item.image}" alt="${item.title}" class="job-image">` : `<i class="fas ${item.icon || 'fa-question'}"></i>`;
        
        let descriptionHtml = '';
        if (type !== 'job' && type !== 'marriage') {
            descriptionHtml = `<p>${item.explanation ? item.explanation.substring(0, 30) + "..." : ''}</p>`;
        }

        cardEl.innerHTML = `${visual}<h4>${item.title.replace(/職業: |結婚💍 - /g, '')}</h4>${descriptionHtml}`;
        
        let infoText = "";
        if (type === 'job') {
            const gross = item.salary[30];
            const net = getNetIncomeDetails(gross).net; 
            infoText = `
                <div style="color:#2b6cb0;">額面年収: ${gross}万円</div>
                <div style="color:#48bb78; font-size:1.1em;">手取り: 約${net}万円</div>
                <button onclick="showLocalExplanation('${item.id}')" style="${infoButtonStyle}"><i class="fas fa-info-circle"></i> 解説を見る</button>
            `;
        } else if (type === 'marriage') {
            const householdGross = getTempHouseholdGross();
            const rank = getCostRank(householdGross);
            const cost = item.costsByIncome[rank];
            infoText = `
                <div style="color:#e53e3e; font-size:1.2em;">費用: ${cost}万円</div>
                <div style="font-size:0.8em; color:#718096;">(世帯年収連動)</div>
                <button onclick="showLocalExplanation('${item.id}')" style="${infoButtonStyle}"><i class="fas fa-info-circle"></i> 解説を見る</button>
            `;
        }
        infoEl.innerHTML = infoText;
    }
    updateCard();

    prevBtn.onclick = () => { currentIndex = (currentIndex - 1 + items.length) % items.length; updateCard(); };
    nextBtn.onclick = () => { currentIndex = (currentIndex + 1) % items.length; updateCard(); };

    const wrapper = document.createElement('div');
    wrapper.style.display = 'flex'; wrapper.style.flexDirection = 'column'; wrapper.style.alignItems = 'center';
    const sliderRow = document.createElement('div');
    sliderRow.className = 'slider-container'; sliderRow.style.margin = "0";
    sliderRow.appendChild(prevBtn); sliderRow.appendChild(cardEl); sliderRow.appendChild(nextBtn);
    wrapper.appendChild(sliderRow); wrapper.appendChild(infoEl);
    container.appendChild(wrapper);
}

function createSimpleSlider(container, items, defaultVal, stateKey) {
    const sliderContainer = document.createElement('div');
    sliderContainer.className = 'slider-container';
    let currentIndex = defaultVal || 0;

    const prevBtn = document.createElement('button');
    prevBtn.className = 'slider-btn';
    prevBtn.innerHTML = '<i class="fas fa-chevron-left"></i>';
    const cardEl = document.createElement('div');
    cardEl.className = 'selection-card active';
    const infoEl = document.createElement('div');
    infoEl.className = 'selection-info';
    infoEl.style.marginTop = "10px";
    infoEl.style.fontWeight = "bold";

    const nextBtn = document.createElement('button');
    nextBtn.className = 'slider-btn';
    nextBtn.innerHTML = '<i class="fas fa-chevron-right"></i>';

    function updateCard() {
        const item = items[currentIndex];
        familyMakeState[stateKey] = item.id;
        let visual = item.image ? `<img src="${item.image}" alt="${item.title}" class="job-image">` : `<i class="fas ${item.icon}"></i>`;
        cardEl.innerHTML = `${visual}<h4>${item.title}</h4><p>${item.desc}</p>`;

        let infoContent = "";
        if (stateKey === 'houseLevel') {
            const householdGross = getTempHouseholdGross();
            const rank = getCostRank(householdGross);
            const typeIndex = familyMakeState.houseType || 0;
            const levelIndex = item.id;
            const cardIdNum = (typeIndex * 3) + levelIndex + 1;
            const cardId = 'H00' + cardIdNum;
            const cardData = CARD_DATA[cardId];
            if (cardData && cardData.costsByIncome) {
                const cost = cardData.costsByIncome[rank];
                infoContent += `<div style="color:#e53e3e; font-size:1.2em;">住居費: ${cost}万円/年</div>`;
            }
        }
        if (item.explanation) {
            const safeHtml = item.explanation.replace(/'/g, "\\'").replace(/"/g, '&quot;').replace(/\n/g, '');
            infoContent += `<button onclick="showLocalExplanation(null, '${safeHtml}')" style="${infoButtonStyle}"><i class="fas fa-info-circle"></i> 解説を見る</button>`;
        }
        infoEl.innerHTML = infoContent;
    }
    updateCard();

    prevBtn.onclick = () => { currentIndex = (currentIndex - 1 + items.length) % items.length; updateCard(); };
    nextBtn.onclick = () => { currentIndex = (currentIndex + 1) % items.length; updateCard(); };

    const wrapper = document.createElement('div');
    wrapper.style.display = 'flex'; wrapper.style.flexDirection = 'column'; wrapper.style.alignItems = 'center';
    const sliderRow = document.createElement('div');
    sliderRow.className = 'slider-container'; sliderRow.style.margin = "0";
    sliderRow.appendChild(prevBtn); sliderRow.appendChild(cardEl); sliderRow.appendChild(nextBtn);
    wrapper.appendChild(sliderRow); wrapper.appendChild(infoEl);
    container.appendChild(wrapper);
}

// ★★★ 子どもルーレット (修正版: メイン画面はシンプルに) ★★★
function toggleChildRoulette() {
    const display = document.getElementById('childRouletteNum');
    const btn = document.getElementById('childRouletteBtn');
    const resContainer = document.getElementById('childResultContainer');
    const resText = document.getElementById('childResultText');
    const costText = document.getElementById('childCostText');
    const resImg = document.getElementById('childResultImg');
    const nextBtn = document.getElementById('makeNextBtn'); // 次へボタン

    if (!isChildRouletteRunning) {
        isChildRouletteRunning = true;
        btn.innerHTML = '<i class="fas fa-stop"></i> ストップ';
        btn.className = 'btn-danger';
        display.style.display = 'block';
        resContainer.style.display = 'none';
        
        childRouletteInterval = setInterval(() => { 
            display.textContent = Math.floor(Math.random() * 3) + 1; 
        }, 50);
    } else {
        isChildRouletteRunning = false;
        clearInterval(childRouletteInterval);
        const count = parseInt(display.textContent);
        familyMakeState.childCount = count;
        
        let childCardId = 'C001';
        if (count === 2) childCardId = 'C002';
        if (count === 3) childCardId = 'C003';
        
        btn.style.cssText = infoButtonStyle; 
        btn.innerHTML = '<i class="fas fa-info-circle"></i> 解説を見る';
        btn.className = '';
        btn.disabled = false;
        btn.onclick = function() { showLocalExplanation(childCardId); };

        // ▼▼▼ 変更点: 次へボタンで「支援金画面」を開くようにする ▼▼▼
        nextBtn.style.display = 'inline-block';
        nextBtn.onclick = function() {
            showChildAllowanceModal(count); // 新しい関数を呼ぶ
        };
        // ▲▲▲ 変更ここまで ▲▲▲

        const imgMap = { 1: "子1.png", 2: "子２.png", 3: "子３.png" };
        const householdGross = getTempHouseholdGross();
        const rank = getCostRank(householdGross);
        
        const baseCost = CARD_DATA[childCardId].costsByIncome[rank];
        const cost30 = Math.round(baseCost * 0.6); 
        const cost40 = Math.round(baseCost * 1.4); 

        // シンプルな費用表示に戻す
        resText.textContent = `子どもが${count}人生まれた！`;
        costText.innerHTML = `
            <div style="font-size:0.9em; margin-bottom:5px;">
                <span style="color:#2f855a; font-weight:bold;">30代: ${cost30}万円/年</span>
                <span style="margin:0 5px; color:#ccc;">|</span>
                <span style="color:#c53030; font-weight:bold;">40代: ${cost40}万円/年</span>
            </div>
            <small style="color:#777; font-weight:normal; font-size:0.7em;">(世帯年収ランクにより変動)</small>
        `;

        resImg.src = imgMap[count] || "";
        display.style.display = 'none';
        resContainer.style.display = 'block';
    }
}

function nextMakeStep() {
    if (familyMakeState.step === 0) { const n = document.getElementById('makeP1Name'); if(n) familyMakeState.p1Name = n.value || 'プレイヤー1'; }
    else if (familyMakeState.step === 1) { const n = document.getElementById('makeP2Name'); if(n) familyMakeState.p2Name = n.value || 'プレイヤー2'; }
    familyMakeState.step++;
    if (familyMakeState.step > 5) finalizeFamilyMake();
    else renderMakeStep();
}

function finalizeFamilyMake() {
    const houseIndex = (familyMakeState.houseType * 3) + familyMakeState.houseLevel + 1;
    familyMakeState.houseId = 'H00' + houseIndex;
    document.getElementById('familyMakeScreen').style.display = 'none';
    document.getElementById('mainGameContainer').style.display = 'block';
    gameState.players.player1.name = familyMakeState.p1Name;
    gameState.players.player1.jobId = familyMakeState.p1JobId;
    gameState.players.player2.name = familyMakeState.p2Name;
    gameState.players.player2.jobId = familyMakeState.p2JobId;
    localStorage.setItem('gameStarted', 'true');
    initGameFromMake();
}

function initGameFromMake() {
    gameState = {
        myPlayerId: gameState.myPlayerId || (Date.now().toString(36) + Math.random().toString(36).substr(2)),
        lastProcessedEventTimestamp: Date.now(),
        currentAge: 30,
        players: {
            player1: { name: '', job: '', income: 0, grossIncome: 0, jobId: null, needsNewJob: false, promotionSuccess: false },
            player2: { name: '', job: '', income: 0, grossIncome: 0, jobId: null, needsNewJob: false, promotionSuccess: false }
        },
        totalAssets: 100, // 初期資産
        happiness: 0, 
        annualExpense: 0,
        marriage: { type: '-', cost: 0, cardScanned: false },
        children: { count: 0, annualCost: 0, cardId: null, cardScanned: false }, 
        house: { type: '-', annualCost: 0, cardId: null, cardScanned: false },
        car: { cards: [], annualCost: 0, cardScanned: false },
        insurance: { life: false, fire: false, auto: false, annualCost: 0, cardScanned: false },
        investment: { tsumitateTotal: 0, ikkatsuTotal: 0, tsumitateLog: [], ikkatsuLog: [] },
        events: [],
        livingCost: 0,
        socialTax: 0, 
        subscriptionSavings: 0, 
        scannedCards: [], 
        balanceHistory: [], 
        isCareerChallengeActive: false,
        currentPlayerChallenge: null,
        currentGuidance: null,
        guidanceContextForApply: null,
        turnEventCompleted: false,
        tempDeductions: null,
        finalInvestmentResult: null, 
        tempInvestmentResult: null,
        turnExpenses: { marriage: 0, car: 0, life_event: 0, social_event: 0, investment_ikkatsu: 0 },
        retirementBonus: { player1: 0, player2: 0, p1Scanned: false, p2Scanned: false },
        lastTurnData: null 
    };

    gameState.players.player1.name = familyMakeState.p1Name;
    gameState.players.player1.jobId = familyMakeState.p1JobId;
    gameState.players.player2.name = familyMakeState.p2Name;
    gameState.players.player2.jobId = familyMakeState.p2JobId;

    const marCard = CARD_DATA[familyMakeState.marriageId];
    gameState.marriage.type = marCard.title;
    gameState.marriage.cardScanned = true;
    if(marCard.life_point) gameState.happiness += marCard.life_point;

    gameState.children.count = familyMakeState.childCount;
    let childId = 'C001';
    if (familyMakeState.childCount === 2) childId = 'C002';
    if (familyMakeState.childCount === 3) childId = 'C003';
    gameState.children.cardId = childId;
    gameState.children.cardScanned = true;
    if(CARD_DATA[childId].life_point) gameState.happiness += CARD_DATA[childId].life_point;

    const houseCard = CARD_DATA[familyMakeState.houseId];
    gameState.house.type = houseCard.title;
    gameState.house.cardId = familyMakeState.houseId;
    gameState.house.cardScanned = true;
    if(houseCard.life_point) gameState.happiness += houseCard.life_point;

    if(CARD_DATA[familyMakeState.p1JobId].life_point) gameState.happiness += CARD_DATA[familyMakeState.p1JobId].life_point;
    if(CARD_DATA[familyMakeState.p2JobId].life_point) gameState.happiness += CARD_DATA[familyMakeState.p2JobId].life_point;

    ['player1', 'player2'].forEach(key => {
        const p = gameState.players[key];
        const card = CARD_DATA[p.jobId];
        p.job = card.title;
        p.grossIncome = card.salary[30];
        p.income = getNetIncomeDetails(p.grossIncome).net;
    });

    const totalIncome = gameState.players.player1.grossIncome + gameState.players.player2.grossIncome;
    let mCost = 0;
    if (totalIncome < 600) mCost = marCard.costsByIncome.low;
    else if (totalIncome < 1000) mCost = marCard.costsByIncome.mid;
    else mCost = marCard.costsByIncome.high;
    
    gameState.marriage.cost = mCost;
    
    // 結婚費用を一括支出
    gameState.totalAssets -= mCost;
    gameState.turnExpenses.marriage += mCost;
    
    addEvent(`結婚式(${marCard.title})を実施。費用${mCost}万円`);

    // 固定費の計算
    updateChildrenCost();
    updateHouseCost();
    recalculateAnnualExpense();
    
    // ★★★ 30代の10年分の収支を先取りして資産に反映 (ログ詳細化) ★★★
    startTurnIncomeAndExpense(30);

    // 表示更新
    updateDisplay();
    addEvent("ファミリーメイク完了！30代の生活がスタートします。");
    
    determineNextGuidance();
    saveGameState();
}
// game.js - 修正版 v13.0 (Part 2/2)

// ==========================================================
// 5. カード適用 & ターン処理 (リアルタイム反映ロジック)
// ==========================================================

function applyCardEffect(cardIdOverride, fromRemote = false) {
    const targetId = cardIdOverride || lastScannedCardId;
    if (!targetId) return;
    
    const c = CARD_DATA[targetId];
    if (!c) return;

    // 履歴に追加
    if (!gameState.scannedCards) gameState.scannedCards = [];
    gameState.scannedCards.push(targetId);
    
    // イベント共有 (オンライン時)
    if (!fromRemote && c.type === 'social_event' && database && currentRoomId) {
        database.ref('rooms/' + currentRoomId + '/globalEvent').set({
            cardId: targetId,
            timestamp: Date.now(),
            senderId: gameState.myPlayerId 
        });
    }

    // --- 退職金トリガーの特殊処理 ---
    if (c.type === 'retirement_trigger') {
        const guid = gameState.guidanceContextForApply || gameState.currentGuidance;
        let pKey = (guid === 'retirement_p1') ? 'player1' : 'player2';
        const p = gameState.players[pKey];
        if (!p.jobId || ['J008','J009','J010'].includes(p.jobId)) {
            gameState.retirementBonus[pKey] = 0;
        } else {
            const tId = 'R' + p.jobId.substring(1) + c.level;
            if (CARD_DATA[tId]) {
                gameState.retirementBonus[pKey] = CARD_DATA[tId].amount;
                if(CARD_DATA[tId].life_point) gameState.happiness += CARD_DATA[tId].life_point;
            }
        }
        gameState.retirementBonus[pKey === 'player1' ? 'p1Scanned' : 'p2Scanned'] = true;
        saveGameState();
        closeCardInfoModal();
        return; // 退職金はここで処理終了
    }

    const logPrefix = fromRemote ? "(共有) " : "";

    // ライフポイント反映
    if (c.life_point) {
        gameState.happiness += c.life_point;
        addEvent(`${logPrefix}ライフポイントアップ！ (+${c.life_point}pt)`);
    }

    // --- 資産変動前の値を保持（アニメーション用） ---
    const oldAssets = gameState.totalAssets;

    let updated = false;
    const val = parseNumber(c.effect) || c.amount || 0;
    const duration = calcTurnDuration(gameState.currentAge);

    switch (c.type) {
        case 'job':
            // 転職: 残りの期間分の「収入差額」を資産に反映
            const targetP = gameState.players.player1.needsNewJob ? gameState.players.player1 : gameState.players.player2;
            const oldIncome = targetP.income;
            
            const gross = c.salary[gameState.currentAge];
            const netD = getNetIncomeDetails(gross);
            
            targetP.jobId = targetId; 
            targetP.job = c.title; 
            targetP.grossIncome = gross; 
            targetP.income = netD.net; 
            targetP.needsNewJob = false;

            const diffIncome = targetP.income - oldIncome;
            const incomeChange = diffIncome * duration;
            gameState.totalAssets += incomeChange;
            
            addEvent(`${logPrefix}転職: 年収変化 ${diffIncome > 0 ? '+' : ''}${diffIncome}万 × ${duration}年 = ${incomeChange}万円`);

            // 転職は手取りモーダルが出るため、アニメーションは裏で行うか省略
            updated = true; 
            closeCardInfoModal(); 
            // 転職の場合はカメラを閉じてガイダンスに戻るか、続けて手取り詳細を出す
            stopScan(); 
            showNetIncomeModal(targetP, gross, netD); 
            // ガイダンス画面に戻してからアニメーション
            const ctx = gameState.guidanceContextForApply || gameState.currentGuidance;
            showGuidanceModal(ctx);
            animateAssetChange(oldAssets, gameState.totalAssets);
            return;
        
        case 'car':
            // ★修正: 自動車は「一括購入」として扱い、期間倍しない
            let carCost = 0;
            const gIncome = gameState.players.player1.grossIncome + gameState.players.player2.grossIncome;
            if (c.costsByIncome) {
                 if (gIncome < 600) carCost = c.costsByIncome.low;
                 else if (gIncome < 1000) carCost = c.costsByIncome.mid;
                 else carCost = c.costsByIncome.high;
            }
            
            // 資産から引く
            gameState.totalAssets -= carCost;
            gameState.turnExpenses.car += carCost; 
            
            // 保有リストに追加
            gameState.car.cards.push({cardId: targetId, title: c.title, baseCosts: c.costsByIncome});
            updated = true; 
            addEvent(`${logPrefix}${c.title} 購入: -${carCost}万円 (一括支出)`); 
            break;
            
        case 'insurance':
            if(targetId === 'I001') gameState.insurance.life = true;
            if(targetId === 'I002') gameState.insurance.fire = true;
            if(targetId === 'I003') gameState.insurance.auto = true;
            
            // 保険料は「固定費」として扱い、残り期間分を前払いとして引く
            const totalInsCost = val * duration;
            gameState.insurance.annualCost += val; 
            gameState.totalAssets -= totalInsCost;
            
            updated = true; 
            addEvent(`${logPrefix}${c.title} 加入: 年間${val}万 × ${duration}年 = -${totalInsCost}万円`); 
            break;
            
        case 'life_event':
            // 一時的なイベント: 即座に資産増減 (一括)
            if (targetId === 'L015') { // 臨時収入
                const income = 30;
                gameState.totalAssets += income;
                gameState.turnExpenses.life_event -= income;
                addEvent(`${logPrefix}${c.title} +${income}万円`);
                updated = true;
                break;
            }
            if (targetId === 'L016') { // サブスク解約
                const savingAmount = 5; 
                gameState.subscriptionSavings = (gameState.subscriptionSavings || 0) + savingAmount;
                const totalSaved = savingAmount * duration;
                gameState.totalAssets += totalSaved;
                addEvent(`${logPrefix}サブスク解約: 年間${savingAmount}万 × ${duration}年 = +${totalSaved}万円 節約`);
                updated = true;
                break;
            }

            let cost = val;
            // 保険適用チェック
            if (targetId === 'L004' && gameState.insurance.auto) cost = 0;
            if ((targetId === 'L005' || targetId === 'L006') && gameState.insurance.life) cost = 0;
            if (targetId === 'L007' && gameState.insurance.fire) cost = 0;
            
            if (cost > 0) { 
                gameState.totalAssets -= cost; 
                gameState.turnExpenses.life_event += cost; 
                addEvent(`${logPrefix}${c.title} -${cost}万円`); 
            } else {
                addEvent(`${logPrefix}${c.title} 保険適用0円`);
            }
            updated = true; break;
            
        case 'life_event_asset_change':
            // 一時支出 (一括)
            let ec = val;
            if (c.costsByIncome) {
                const g = gameState.players.player1.grossIncome + gameState.players.player2.grossIncome;
                ec = (g < 600) ? c.costsByIncome.low : (g < 1000 ? c.costsByIncome.mid : c.costsByIncome.high);
            }
            if (ec > 0) { 
                gameState.totalAssets -= ec; 
                gameState.turnExpenses.life_event += ec; 
                addEvent(`${logPrefix}${c.title} -${ec}万円 (一括支出)`); 
            }
            updated = true; break;
            
        case 'social_event':
            const hi = gameState.players.player1.income + gameState.players.player2.income;
            
            if (targetId === 'S007') { // 給付金 & 増税
                gameState.totalAssets += 10;
                gameState.turnExpenses.social_event -= 10; 
                addEvent(`${logPrefix}給付金 +10万円を受け取りました`);

                const g = (gameState.players.player1.grossIncome || 0) + (gameState.players.player2.grossIncome || 0);
                let taxIncrease = 0;
                if (g < 600) taxIncrease = 0.6;
                else if (g < 1000) taxIncrease = 1.2;
                else taxIncrease = 3.6;

                const totalTax = taxIncrease * duration;
                gameState.socialTax = (gameState.socialTax || 0) + taxIncrease;
                gameState.totalAssets -= totalTax;
                
                addEvent(`${logPrefix}増税: 年間${taxIncrease.toFixed(1)}万 × ${duration}年 = -${totalTax.toFixed(1)}万円`);
            }
            else if (targetId === 'S001') { // 好景気
                const g = Math.round(hi * 0.2); 
                gameState.totalAssets += g; 
                gameState.turnExpenses.social_event -= g; 
                addEvent(`${logPrefix}好景気: 臨時ボーナス +${g}万円`); 
            }
            else if (targetId === 'S002') { // 不景気
                const l = Math.round(hi * 0.2); 
                gameState.totalAssets -= l; 
                gameState.turnExpenses.social_event += l; 
                addEvent(`${logPrefix}不景気: 臨時支出 -${l}万円`); 
            }
            else { 
                // その他の社会イベント(一時金)
                let cost = val;
                if (c.costsByIncome) {
                    const g = (gameState.players.player1.grossIncome || 0) + (gameState.players.player2.grossIncome || 0);
                    if (g < 600) cost = c.costsByIncome.low;
                    else if (g < 1000) cost = c.costsByIncome.mid;
                    else cost = c.costsByIncome.high;
                }
                if (cost > 0) { 
                    gameState.totalAssets -= cost; 
                    gameState.turnExpenses.social_event += cost; 
                    addEvent(`${logPrefix}${c.title} -${cost}万円`); 
                } else {
                    addEvent(`${logPrefix}${c.title} 発生`);
                }
            }
            updated = true; break;
            
        case 'investment':
            if (c.effect.includes('積立')) { 
                // 積立: 資産から「年額×年数」を引く
                const totalInv = val * duration;
                gameState.investment.tsumitateTotal += val; 
                gameState.totalAssets -= totalInv;
                addEvent(`${logPrefix}${c.title}: 積立開始 -${totalInv}万円 (資産から移動)`); 
            } else { 
                // 一括投資: 即座に資産から引く
                gameState.investment.ikkatsuTotal += val; 
                gameState.investment.ikkatsuLog.push({amount:val, startAge:gameState.currentAge}); 
                gameState.totalAssets -= val; 
                gameState.turnExpenses.investment_ikkatsu += val; 
                addEvent(`${logPrefix}${c.title} -${val}万円 (資産から移動)`); 
            }
            updated = true; break;
    }

    if (!fromRemote) {
        // 詳細モーダルを閉じる
        closeCardInfoModal();
    }
    
    if (updated) { 
        recalculateAnnualExpense(); 
        updateDisplay(); 
        saveGameState(); 

        if (!fromRemote) {
            // 修正: 処理完了後はカメラを確実に停止し、ガイダンス画面へ戻ってアニメーションを表示
            stopScan(); 
            
            // 適用後のガイダンス画面を表示
            const used = gameState.guidanceContextForApply || gameState.currentGuidance;
            showGuidanceModal(used); 
            
            // ガイダンス画面で資産変動アニメーションを実行
            animateAssetChange(oldAssets, gameState.totalAssets);
            
            gameState.guidanceContextForApply = null;
        }
    }
}

// ガイダンス画面用サブ画面HTMLの生成（動的挿入は不要、index.htmlに静的に記述済み）
// ただし値を更新するためにヘルパー関数を利用
function createGuidanceStats(assetValue) {
    const panelContainer = document.getElementById('guidance-asset-panel-container');
    if(panelContainer) {
        // デザイン復旧: style.cssの .guidance-asset-panel-style を適用し、枠と単位を表示
        panelContainer.innerHTML = `
            <div class="guidance-asset-panel-style">
                <div style="font-size:0.9em; color:#ccc;">現在の総資産</div>
                <div style="font-size:2.5em; font-weight:bold; color:#FFD700; font-family:monospace; line-height:1.2;">
                    <span class="guidance-asset-value" id="guidanceAssetValue">${Math.round(assetValue).toLocaleString()}</span>
                    <span style="font-size:0.6em; color:white;">万円</span>
                </div>
                <div id="guidanceAssetDiff" style="height:30px; font-weight:bold; font-size:1.5em; margin-top:5px; opacity:0;"></div>
            </div>
        `;
    }
}

// カメラ画面用サブ画面（カメラ使用時のリアルタイム確認用として残す）
function createScanOverlay() {
    const existing = document.getElementById('scanStatsPanel');
    if (existing) existing.remove();

    const panel = document.createElement('div');
    panel.id = 'scanStatsPanel';
    panel.style.cssText = `
        background: #333; color: white; padding: 15px; text-align: center;
        border-top: 3px solid #FFD700; width: 100%; box-sizing: border-box;
        margin-top: 10px; border-radius: 0 0 15px 15px;
    `;
    
    panel.innerHTML = `
        <div style="font-size:0.9em; color:#ccc;">現在の総資産</div>
        <div style="font-size:2em; font-weight:bold; color:#FFD700; font-family:monospace;">
            <span id="scanAssetValue">${Math.round(gameState.totalAssets).toLocaleString()}</span>
            <span style="font-size:0.6em; color:white;">万円</span>
        </div>
        <div id="scanAssetDiff" style="height:30px; font-weight:bold; font-size:1.5em; margin-top:5px;"></div>
    `;
    
    const cameraModalContent = document.querySelector('#cameraModal .modal-content');
    if (cameraModalContent) {
        const cameraView = cameraModalContent.querySelector('.camera-view');
        if (cameraView) {
            cameraView.insertAdjacentElement('afterend', panel);
        } else {
            cameraModalContent.appendChild(panel);
        }
    }
}

// LPカウンター風アニメーション
function animateValue(id, start, end, duration) {
    const obj = document.getElementById(id);
    if (!obj) return;
    const range = end - start;
    if (range === 0) return;
    let startTime = null;
    
    function step(timestamp) {
        if (!startTime) startTime = timestamp;
        const progress = Math.min((timestamp - startTime) / duration, 1);
        const ease = 1 - Math.pow(1 - progress, 3);
        obj.innerHTML = Math.floor(start + (range * ease)).toLocaleString();
        if (progress < 1) {
            window.requestAnimationFrame(step);
        } else {
            obj.innerHTML = end.toLocaleString();
        }
    }
    window.requestAnimationFrame(step);
}

// 資産変動アニメーション（ラッパー）
function animateAssetChange(startVal, endVal) {
    const diff = endVal - startVal;
    if (diff === 0) return;
    
    // 1. ガイダンス画面のパネル更新
    const guideDiff = document.getElementById('guidanceAssetDiff');
    // ガイダンスモーダルが表示されているか、あるいはこれから表示される想定
    if (guideDiff) {
        guideDiff.textContent = (diff > 0 ? "+" : "") + diff.toLocaleString() + "万円";
        guideDiff.style.color = diff > 0 ? "#48bb78" : "#f56565"; 
        guideDiff.style.opacity = '1';
        setTimeout(() => { if(guideDiff) guideDiff.style.opacity = '0'; }, 3000);
        animateValue("guidanceAssetValue", startVal, endVal, 1500);
    }

    // 2. カメラ画面のパネル更新 (念のため)
    const scanDiff = document.getElementById('scanAssetDiff');
    if (scanDiff && document.getElementById('cameraModal').style.display !== 'none') {
        scanDiff.textContent = (diff > 0 ? "+" : "") + diff.toLocaleString() + "万円";
        scanDiff.style.color = diff > 0 ? "#48bb78" : "#f56565"; 
        scanDiff.style.opacity = '1';
        setTimeout(() => { if(scanDiff) scanDiff.style.opacity = '0'; }, 3000);
        animateValue("scanAssetValue", startVal, endVal, 1500);
    }
}
// ==========================================================
// 6. ターン処理
// ==========================================================
function nextTurn() {
    if (gameState.isCareerChallengeActive) { alert("キャリアチャレンジを完了してください"); return; }
    if (gameState.currentGuidance) { alert("指示に従ってください"); return; }
    
    gameState.turnEventCompleted = false; 
    gameState.car.cardScanned = false;
    
    recalculateAnnualExpense();
    
    const ai = gameState.players.player1.income + gameState.players.player2.income; 
    const ae = gameState.annualExpense; 

    let years = 10;
    if (gameState.currentAge === 60) {
        years = 5; 
    }

    gameState.lastTurnData = {
        age: gameState.currentAge,
        p1Gross: gameState.players.player1.grossIncome,
        p2Gross: gameState.players.player2.grossIncome,
        livingCost: gameState.livingCost,
        houseCost: gameState.house.annualCost
    };

    // フロー収支 (10年間の収入 - 固定費)
    const flowDiff = (ai - ae) * years;
    
    // ★ totalAssets への反映は「フロー収支」のみ行う
    // (一時支出は applyCardEffect ですでに減算済みのため)
    gameState.totalAssets += flowDiff;

   // --- 履歴には全収支を記録 ---
    const oneTimeExpenses = Object.values(gameState.turnExpenses).reduce((a, b) => a + b, 0);
    // 期間合計収支 = フロー収支 - 一時支出
    const finalDiff = flowDiff - oneTimeExpenses;

    gameState.balanceHistory.push({
        age: gameState.currentAge, 
        income: ai, 
        expense: ae, 
        years: years, 
        diff: flowDiff, 
        oneTimeExpenses: oneTimeExpenses, 
        finalDiff: finalDiff,
        // ▼▼▼ 【重要修正】ここを追加！グラフ描画に必須です ▼▼▼
        assetsAtEnd: gameState.totalAssets, 
        // ▲▲▲ 追加ここまで ▲▲▲
        details: {
            p1Income: gameState.players.player1.income || 0,
            p2Income: gameState.players.player2.income || 0,
            childCost: (gameState.currentAge < 50) ? gameState.children.annualCost : 0,
            houseCost: (gameState.currentAge <= 60) ? gameState.house.annualCost : 0, 
            carCost: gameState.car.annualCost,
            insuranceCost: gameState.insurance.annualCost,
            livingCost: gameState.livingCost,
            tsumitate: gameState.investment.tsumitateTotal,
            marriage: gameState.turnExpenses.marriage || 0,
            life_event: gameState.turnExpenses.life_event || 0,
            social_event: gameState.turnExpenses.social_event || 0,
            investment_ikkatsu: gameState.turnExpenses.investment_ikkatsu || 0,
            carCost_init: gameState.turnExpenses.car || 0
        }
    });

    if (gameState.investment.tsumitateTotal > 0) {
        gameState.investment.tsumitateLog.push({ 
            amount: gameState.investment.tsumitateTotal, 
            startAge: gameState.currentAge, 
            endAge: (gameState.currentAge === 60) ? 65 : gameState.currentAge + 10 
        });
    }
    
    gameState.investment.tsumitateTotal = 0;
    gameState.insurance.life = false; 
    gameState.insurance.fire = false; 
    gameState.insurance.auto = false; 
    gameState.insurance.annualCost = 0; 
    gameState.insurance.cardScanned = false;
    gameState.car.cards = [];
    gameState.car.annualCost = 0;

    resetTurnExpenses(); // リセット
    
    addEvent(`${gameState.currentAge}代 終了。期間収支: ${finalDiff >= 0 ? '+' : ''}${finalDiff}万円`);
    
    gameState.currentAge += 10;

    // ▼▼▼ 修正: キャリア年齢の進行制御 ▼▼▼
    ['player1', 'player2'].forEach(key => {
        const p = gameState.players[key];
        if (p.careerAge) {
            // 次が60代(currentAgeが60)になる時は、キャリア年齢を上げない（現状維持）
            // これにより、50代で転職した人が60代で昇給してしまうのを防ぎます
            if (gameState.currentAge < 60) {
                p.careerAge += 10;
            }
        }
    });
    saveGameState(); 

    if (gameState.currentAge >= 70) { 
        updateDisplay(); 
        showTurnStartModal(60, true); 
    } else if (gameState.currentAge === 40 || gameState.currentAge === 50) { 
        gameState.isCareerChallengeActive = true; 
        showCareerChallenge('player1'); 
    } else { 
        updateStateForNewTurn(); 
        updateDisplay(); 
        showTurnStartModal(gameState.currentAge - 10, false); 
    }
}

function updateStateForNewTurn() {
    ['player1', 'player2'].forEach(key => {
        const p = gameState.players[key];

        if (typeof p.promotionBonus === 'undefined') p.promotionBonus = 0;

        if (p.needsNewJob) { 
            p.job = "求職中"; 
            p.income = 0; 
            p.grossIncome = 0; 
            p.promotionBonus = 0; 
        } 
        else if (p.jobId) {
            // ▼ キャリア年齢ロジック
            let wageAge = p.careerAge || gameState.currentAge;
            
            // ▼▼▼ 修正: 50代と60代の年収は変わらないようにする ▼▼▼
            // 60歳以上でも「50代の給与テーブル」を参照するようにキャップをかけます
            if (wageAge >= 50) wageAge = 50;
            else if (wageAge >= 40) wageAge = 40;
            else wageAge = 30;
            // ▲▲▲ 修正ここまで ▲▲▲

            // ▼ 1. 基本給を取得
            let baseGross = CARD_DATA[p.jobId].salary[wageAge] || 0;
            
            if (baseGross === 0 && p.grossIncome > 0) {
                baseGross = p.grossIncome - p.promotionBonus;
            }

            // ▼ 2. 昇格成功時の計算
            if (p.promotionSuccess) {
                let currentTotal = baseGross + p.promotionBonus;
                let newTotal = Math.round(currentTotal * 1.1);
                p.promotionBonus = newTotal - baseGross;
                p.promotionSuccess = false; 
            }

            // ▼ 3. 最終的な年収
            p.grossIncome = baseGross + p.promotionBonus;
            p.income = getNetIncomeDetails(p.grossIncome).net;
        }
    });
    recalculateAnnualExpense(); 
}

// UI更新
function updateDisplay() {
    document.querySelector('#player1 .player-name').textContent = gameState.players.player1.name || 'プレイヤー1';
    document.getElementById('p1-job').textContent = gameState.players.player1.job || '-';
    document.getElementById('p1-income').textContent = gameState.players.player1.income || 0;
    document.querySelector('#player2 .player-name').textContent = gameState.players.player2.name || 'プレイヤー2';
    document.getElementById('p2-job').textContent = gameState.players.player2.job || '-';
    document.getElementById('p2-income').textContent = gameState.players.player2.income || 0;
    
    document.getElementById('current-age').textContent = (gameState.currentAge < 70) ? (gameState.currentAge === 60 ? "60-64歳" : `${gameState.currentAge}代`) : "65歳～";
    
    const householdNetIncome = (gameState.players.player1.income || 0) + (gameState.players.player2.income || 0);
    document.getElementById('household-income').textContent = householdNetIncome;
    document.getElementById('total-assets').textContent = Math.round(gameState.totalAssets).toLocaleString();
    document.getElementById('annual-expense').textContent = gameState.annualExpense.toLocaleString();
    
    document.getElementById('current-happiness').textContent = gameState.happiness || 0;

    // 詳細表示
    document.getElementById('marriage-type').textContent = gameState.marriage.type;
    document.getElementById('marriage-cost').textContent = gameState.marriage.cost;
    document.getElementById('children-count').textContent = gameState.children.count;
    document.getElementById('children-cost').textContent = gameState.children.annualCost;
    document.getElementById('house-type').textContent = gameState.house.type;
    document.getElementById('house-cost').textContent = gameState.house.annualCost;

    const carCount = gameState.car.cards.length;
    const carTypes = carCount > 0 ? gameState.car.cards.map(c => c.title.replace('自動車🚗 - ', '')).join(', ') : '-';
    document.getElementById('car-type').textContent = carTypes; 
    document.getElementById('car-count').textContent = carCount; 
    document.getElementById('car-cost').textContent = gameState.car.annualCost; 

    document.getElementById('life-insurance').textContent = gameState.insurance.life ? '加入' : '未加入';
    document.getElementById('fire-insurance').textContent = gameState.insurance.fire ? '加入' : '未加入';
    document.getElementById('auto-insurance').textContent = gameState.insurance.auto ? '加入' : '未加入';
    document.getElementById('insurance-cost').textContent = gameState.insurance.annualCost;
    document.getElementById('living-cost').textContent = gameState.livingCost;
    
    document.getElementById('tsumitate-amount').textContent = gameState.investment.tsumitateTotal || 0;
    document.getElementById('ikkatsu-amount').textContent = gameState.investment.ikkatsuTotal || 0;
}

function addEvent(message) {
    gameState.events.push(message);
    const list = document.getElementById('event-list');
    if (list) {
        const p = document.createElement('p');
        p.textContent = message;
        list.appendChild(p);
        list.scrollTop = list.scrollHeight;
    }
}

function resetTurnExpenses() {
    gameState.turnExpenses = { marriage: 0, car: 0, life_event: 0, social_event: 0, investment_ikkatsu: 0 };
}

function updateHouseCost() {
    if (!gameState.house.cardId) { gameState.house.annualCost = 0; return; }
    const c = CARD_DATA[gameState.house.cardId];
    if (!c || !c.costsByIncome) { gameState.house.annualCost = 0; return; }
    const g = (gameState.players.player1.grossIncome || 0) + (gameState.players.player2.grossIncome || 0);
    gameState.house.annualCost = (g < 600) ? c.costsByIncome.low : (g < 1000 ? c.costsByIncome.mid : c.costsByIncome.high);
}

function updateChildrenCost() {
    if (!gameState.children.cardId) { gameState.children.annualCost = 0; return; }
    const c = CARD_DATA[gameState.children.cardId];
    if (!c || !c.costsByIncome) { gameState.children.annualCost = 0; return; }
    const g = (gameState.players.player1.grossIncome || 0) + (gameState.players.player2.grossIncome || 0);
    gameState.children.annualCost = (g < 600) ? c.costsByIncome.low : (g < 1000 ? c.costsByIncome.mid : c.costsByIncome.high);
}

function updateCarCost() {
    gameState.car.annualCost = gameState.car.cards.length * 30; // 簡易計算
}

function calculateLivingCost() {
    const g = (gameState.players.player1.grossIncome || 0) + (gameState.players.player2.grossIncome || 0);
    if (g < 400) gameState.livingCost = 156;
    else if (g < 500) gameState.livingCost = 168;
    else if (g < 600) gameState.livingCost = 180;
    else if (g < 700) gameState.livingCost = 198;
    else if (g < 800) gameState.livingCost = 216;
    else if (g < 900) gameState.livingCost = 240;
    else if (g < 1000) gameState.livingCost = 264;
    else if (g < 1250) gameState.livingCost = 300;
    else gameState.livingCost = 360;
}

// 年間支出を再計算する関数（修正版：第3子増額対応）
function recalculateAnnualExpense() {
    let total = 0;

    // 1. 住宅ローン (60代まで)
    if (gameState.currentAge <= 60 && gameState.house && gameState.house.annualCost) {
        total += gameState.house.annualCost;
    } 

    // 2. 教育費 (30代, 40代のみ発生)
    let childCost = 0;
    if (gameState.children && gameState.children.cardId && gameState.currentAge < 50) {
        const p1Income = gameState.players.player1.grossIncome || 0;
        const p2Income = gameState.players.player2.grossIncome || 0;
        const householdIncome = p1Income + p2Income;
        
        let rank = 'mid';
        if (householdIncome < 600) rank = 'low';
        else if (householdIncome >= 1000) rank = 'high';

        const baseCost = CARD_DATA[gameState.children.cardId].costsByIncome[rank];

        // 子どもの人数を取得
        let childCount = 0;
        if (gameState.children.cardId === 'C001') childCount = 1;
        if (gameState.children.cardId === 'C002') childCount = 2;
        if (gameState.children.cardId === 'C003') childCount = 3;

        // ▼▼▼ 児童手当の計算 (第3子増額ロジック) ▼▼▼
        let totalAllowanceAnnual = 0;
        if (childCount === 1) {
            totalAllowanceAnnual = 12; // 12万
        } else if (childCount === 2) {
            totalAllowanceAnnual = 24; // 12万 + 12万
        } else if (childCount === 3) {
            totalAllowanceAnnual = 60; // 12万 + 12万 + 36万(第3子)
        }
        // ▲▲▲ ▲▲▲

        if (gameState.currentAge === 30) {
            // 30代: 本来費用の60% - 手当(満額)
            let rawCost = Math.round(baseCost * 0.6);
            childCost = rawCost - totalAllowanceAnnual;

        } else if (gameState.currentAge === 40) {
            // 40代: 本来費用の140% - 手当(8年分を平均化)
            let rawCost = Math.round(baseCost * 1.4); 
            // 8年分の総額を10年で割る
            let avgAllowance40s = (totalAllowanceAnnual * 8) / 10;
            
            childCost = rawCost - Math.round(avgAllowance40s);
        }

        if (childCost < 0) childCost = 0;
        gameState.children.annualCost = childCost;
    } else {
        if(gameState.children) gameState.children.annualCost = 0;
    }
    total += (gameState.children ? gameState.children.annualCost : 0);

    // 3. 車
    if (gameState.car && gameState.car.annualCost) {
        total += gameState.car.annualCost;
    }

    // 4. 保険
    if (gameState.insurance && gameState.insurance.annualCost) {
        total += gameState.insurance.annualCost;
    }

    // 5. 生活費
    let livingCost = 0;
    const p1 = gameState.players.player1.grossIncome || 0;
    const p2 = gameState.players.player2.grossIncome || 0;
    const houseIncome = p1 + p2;
    let baseLiving = 120 + (houseIncome * 0.1);
    
    let childCount = 0;
    if(gameState.children && gameState.children.cardId) {
        if(gameState.children.cardId === 'C001') childCount = 1;
        if(gameState.children.cardId === 'C002') childCount = 2;
        if(gameState.children.cardId === 'C003') childCount = 3;
    }
    baseLiving += (childCount * 30);
    
    livingCost = Math.round(baseLiving);
    gameState.livingCost = livingCost;
    total += livingCost;

    // 6. 積立投資
    if (gameState.investment && gameState.investment.tsumitateTotal) {
        total += gameState.investment.tsumitateTotal;
    }

    // 7. 社会保険料
    if (gameState.socialTax) {
        total += gameState.socialTax;
    }

    // 8. 節約効果
    const savings = gameState.subscriptionSavings || 0;
    total -= savings;

    if (total < 0) total = 0;
    gameState.annualExpense = total;
    updateDisplay();
}

function saveGameState() {
    try { localStorage.setItem(GAME_STATE_KEY, JSON.stringify(gameState)); localStorage.setItem(BALANCE_HISTORY_KEY, JSON.stringify(gameState.balanceHistory)); } catch (e) { console.error(e); }
}

function loadGameState() {
    try {
        const s = localStorage.getItem(GAME_STATE_KEY);
        if (s) { Object.assign(gameState, JSON.parse(s)); resetTurnExpenses(); return true; }
    } catch (e) { localStorage.removeItem(GAME_STATE_KEY); }
    return false;
}

// ==========================================================
// 6. UIイベント系
// ==========================================================

function openMainScanButton() {
    const context = gameState.guidanceContextForApply || gameState.currentGuidance;
    if (context) {
        gameState.guidanceContextForApply = null; 
        showGuidanceModal(context); 
    } else if (gameState.isCareerChallengeActive) {
        alert("キャリアチャレンジを完了してください。");
    } else {
        openCamera();
    }
}

// 【修正版】openCamera 関数 (待機時間の設定を追加)
let scanStartTime = 0; // 読み取り開始時間を管理する変数

function openCamera() {
    const modal = document.getElementById('cameraModal');
    if (modal) modal.style.display = 'flex';
    
    const statusEl = document.getElementById('scanStatus');
    // メッセージを「準備中」にする
    if (statusEl) statusEl.textContent = 'カメラ起動中... (準備中)';

    // ★重要: 今から「1500ミリ秒(1.5秒)」後まで読み取りを禁止する設定
    scanStartTime = Date.now() + 1500; 

    navigator.mediaDevices.getUserMedia({ video: { facingMode: "environment" } })
        .then(stream => {
            cameraStream = stream;
            const video = document.getElementById('cameraVideo');
            video.srcObject = stream;
            // iOSなどで動画が再生されない問題を防ぐおまじない
            video.setAttribute("playsinline", true); 
            video.play();
            
            scanning = true;
            scanQR();
        })
        .catch(err => {
            console.error('カメラエラー:', err);
            if (statusEl) statusEl.textContent = 'カメラを起動できませんでした';
        });
}
    

// 【修正版】scanQR 関数 (タイムラグの実装)
function scanQR() {
    if (!scanning) { 
        if (animationFrameId) { cancelAnimationFrame(animationFrameId); animationFrameId = null; } 
        return; 
    }
    
    const video = document.getElementById('cameraVideo');
    const canvas = document.getElementById('cameraCanvas');
    const ctx = canvas.getContext('2d');
    const statusEl = document.getElementById('scanStatus');

    if (video.readyState === video.HAVE_ENOUGH_DATA && video.videoWidth > 0) {
        if (canvas.width !== video.videoWidth) { 
            canvas.width = video.videoWidth; 
            canvas.height = video.videoHeight; 
        }
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

        // ★重要: 待機時間が経過しているかチェック
        if (Date.now() < scanStartTime) {
            // まだ待機時間なら、残り時間を計算して表示（解析はしない）
            if (statusEl) {
                // 視覚的に「待機中」であることを伝える枠を描画しても良い
                ctx.strokeStyle = "orange";
                ctx.lineWidth = 5;
                ctx.strokeRect(0, 0, canvas.width, canvas.height);
                statusEl.textContent = "カメラ調整中... (まもなく開始)";
            }
            // 解析せずに次のフレームへ
            animationFrameId = requestAnimationFrame(scanQR);
            return; 
        }

        // --- ここから下は通常の解析処理 ---
        if (statusEl) statusEl.textContent = 'QRコードをスキャンしてください';

        try { 
            const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height); 
            const code = jsQR(imageData.data, canvas.width, canvas.height); 
            
            if (code && code.data) { 
                // 緑の枠を表示して読み取り成功を可視化
                ctx.strokeStyle = "#48bb78";
                ctx.lineWidth = 4;
                ctx.strokeRect(code.location.topLeftCorner.x, code.location.topLeftCorner.y, code.location.width, code.location.height); // 簡易的な枠表示
                
                handleQRCode(code.data); 
            } 
        } catch (e) { 
            console.error("Canvas error:", e); 
        }
    }
    
    if (scanning) { 
        animationFrameId = requestAnimationFrame(scanQR); 
    }
}

function handleQRCode(data) {
    try {
        let id = null;
        try { const url = new URL(data, window.location.href); id = url.searchParams.get('card_id'); } catch(e) { id = data; }
        
        if (id && CARD_DATA[id]) { 
            // 修正: 読み込み成功時は即座にカメラを停止
            stopScan(); 
            lastScannedCardId = id; 
            showCardInfo(id); 
        }
    } catch (e) { console.error(e); }
}

function stopScan() {
    scanning = false;
    if (animationFrameId) cancelAnimationFrame(animationFrameId);
    if (cameraStream) { cameraStream.getTracks().forEach(t => t.stop()); cameraStream = null; }
    const m = document.getElementById('cameraModal');
    if (m) m.style.display = 'none';
}

function closeCameraAndReturn() {
    stopScan();
    const previousContext = gameState.guidanceContextForApply;
    if (previousContext) {
        gameState.guidanceContextForApply = null; 
        showGuidanceModal(previousContext);
    } else {
        determineNextGuidance();
    }
}

function goBackGuidance() {
    const current = gameState.currentGuidance;
    if (current === 'insurance') {
        gameState.car.cardScanned = false; 
        determineNextGuidance(); 
    } 
    else if (current === 'turnEvent') {
        gameState.insurance.cardScanned = false; 
        determineNextGuidance(); 
    } 
    else {
        document.getElementById('guidanceModal').style.display = 'none';
    }
}

function showCardInfo(id) {
    const c = CARD_DATA[id];
    if (!c) return;
    lastScannedCardId = id;
    
    const titleEl = document.getElementById('card-info-title');
    const idEl = document.getElementById('card-info-id');
    const effectEl = document.getElementById('card-info-effect');
    const applyBtn = document.getElementById('applyCardEffectButton');
    let dTitle = c.title, dEffect = c.effect || '', showBtn = true;

    if (c.type === 'retirement_trigger') {
        // 退職金表示ロジック (変更なし)
        const guid = gameState.guidanceContextForApply || gameState.currentGuidance;
        let pKey = (guid === 'retirement_p1') ? 'player1' : (guid === 'retirement_p2' ? 'player2' : null);
        if (pKey) {
            const p = gameState.players[pKey];
            if (!p.jobId || ['J008','J009','J010'].includes(p.jobId)) { dEffect = `【${p.name}】は退職金対象外です。`; showBtn = false; }
            else {
                const tId = 'R' + p.jobId.substring(1) + c.level;
                const tCard = CARD_DATA[tId];
                if (tCard) { dTitle = `【${p.name}】${tCard.title}`; dEffect = `退職金: ${tCard.amount}万円`; }
                else { dEffect = "データ不明"; showBtn = false; }
            }
        } else { dEffect = "対象不明"; showBtn = false; }
    } else if (c.costsByIncome) {
        const g = (gameState.players.player1.grossIncome || 0) + (gameState.players.player2.grossIncome || 0);
        let cost = 0;
        if (g < 600) cost = c.costsByIncome.low;
        else if (g < 1000) cost = c.costsByIncome.mid;
        else cost = c.costsByIncome.high;
        
        let unit = (c.type === 'car') ? '万円 (一括)' : (['house','children'].includes(c.type)) ? '万円/年' : '万円 (一括)';
        dEffect = `${cost}${unit} (世帯年収連動)`;
    }
    
    if (c.life_point) dEffect += `<br><span style="color:#e53e3e; font-weight:bold;">❤️ ライフポイント: +${c.life_point}pt</span>`;

    titleEl.textContent = dTitle;
    idEl.textContent = `ID: ${id}`;
    effectEl.innerHTML = dEffect;
    applyBtn.style.display = showBtn ? 'block' : 'none';
    document.getElementById('cardInfoModal').style.display = 'flex';
}

function closeCardInfoModal() {
    document.getElementById('cardInfoModal').style.display = 'none';
    lastScannedCardId = null;
    const g = gameState.guidanceContextForApply || gameState.currentGuidance;
    if (g === 'retirement_p1' || g === 'retirement_p2') showRetirementBonusModal();
}

function showTurnStartModal(age, isFinalTurn) {
    const m = document.getElementById('turnStartModal');
    document.getElementById('turn-start-title').textContent = isFinalTurn ? '60代終了' : `${gameState.currentAge}代開始`;
    document.getElementById('turn-start-text').textContent = isFinalTurn ? 'お疲れ様でした！セカンドライフへ。' : '新しい年代が始まります。';
    m.style.display = 'flex';
}

function proceedToTurnActions() {
    document.getElementById('turnStartModal').style.display = 'none';
    if (gameState.currentAge >= 70) showRetirementBonusModal(); else showAgeGuidanceModal(gameState.currentAge);
}

// 年代開始時のガイダンス表示（修正版：専用画面 "ageGuidanceModal" を使用してデザイン復旧）
function showAgeGuidanceModal(a) { 
    const last = gameState.lastTurnData;
    let comparisonHtml = "";
    
    // 1. 変化の表示 (30代→40代など)
    if (last) {
        comparisonHtml += `<div style="background:#f8f9fa; padding:15px; border-radius:8px; margin-bottom:20px; font-size:0.95em;">
            <h4 style="margin:0 0 10px 0; border-bottom:1px dashed #ccc; padding-bottom:5px;">${a-10}代 <i class="fas fa-arrow-right"></i> ${a}代 変化</h4>`;
        
        const fmt = (oldVal, newVal) => {
            const diff = newVal - oldVal;
            const sign = diff > 0 ? '+' : '';
            const style = diff !== 0 ? 'font-weight:bold; color:#d35400;' : '';
            return `${oldVal}万円 <i class="fas fa-arrow-right"></i> <span style="${style}">${newVal}万円</span> (${sign}${diff})`;
        };
        
        const p1Now = gameState.players.player1.grossIncome;
        comparisonHtml += `<div style="margin-bottom:8px;"><strong><i class="fas fa-user"></i> ${gameState.players.player1.name} 年収:</strong><br>${fmt(last.p1Gross, p1Now)}</div>`;
        
        const p2Now = gameState.players.player2.grossIncome;
        comparisonHtml += `<div style="margin-bottom:8px;"><strong><i class="fas fa-user"></i> ${gameState.players.player2.name} 年収:</strong><br>${fmt(last.p2Gross, p2Now)}</div>`;
        
        const liveNow = gameState.livingCost;
        comparisonHtml += `<div style="margin-bottom:8px;"><strong><i class="fas fa-shopping-cart"></i> 基本生活費:</strong><br>${fmt(last.livingCost, liveNow)}</div>`;

        // ▼▼▼ 追加: 40代の児童手当情報（デザインを崩さず挿入） ▼▼▼
        if (a === 40 && gameState.children && gameState.children.cardId) {
            let childCount = 0;
            if (gameState.children.cardId === 'C001') childCount = 1;
            if (gameState.children.cardId === 'C002') childCount = 2;
            if (gameState.children.cardId === 'C003') childCount = 3;

            if (childCount > 0) {
                // 手当額の計算 (第3子増額対応: 1,2人目=12万, 3人目以降=36万)
                let annualAmt = 0;
                if (childCount === 1) annualAmt = 12;
                else if (childCount === 2) annualAmt = 24;
                else if (childCount === 3) annualAmt = 60; // 12+12+36

                // 40代の10年間のうち、18歳までの8年間支給と仮定
                const totalBenefit = annualAmt * 8; 
                const avgBenefit = Math.round(totalBenefit / 10); // 年平均に換算
                
                // 比較ボックスの中に、少し色を変えて表示
                comparisonHtml += `<div style="margin-top:10px; background:#f0fff4; padding:8px; border-radius:5px; border:1px solid #48bb78; font-size:0.9em; color:#2f855a;">
                    <strong><i class="fas fa-hand-holding-heart"></i> 40代の児童手当 (18歳まで)</strong><br>
                    <div style="margin-left:10px; margin-top:3px;">
                        総額: <span style="font-weight:bold;">+${totalBenefit}万円</span> 相当<br>
                        <span style="font-size:0.85em; opacity:0.8;">(教育費から年平均 ${avgBenefit}万円 割引済)</span>
                    </div>
                </div>`;
            }
        }
        // ▲▲▲ 追加ここまで ▲▲▲

        comparisonHtml += `</div>`;
    }

    // 2. 年代別アドバイス (元のコードの内容を維持)
    let txt = "";
    const ul = `style="list-style-type:none;padding:0;margin-top:15px;"`;
    const li = `style="position:relative;padding-left:25px;margin-bottom:10px;line-height:1.5;"`;
    const ic = `style="position:absolute;left:0;top:4px;color:#FF7F50;"`;

    if(a === 40) {
        txt = `<p><b>40代: 人生最大の「支出の山場」</b></p><p style="font-size:0.95em; color:#666; margin-top:5px;">住宅ローンと教育費が重なる、家計にとって最も厳しい時期です。</p><ul ${ul}><li ${li}><i class="fas fa-university" ${ic}></i> <b>教育費ピーク:</b> お子様の進学で支出が急増します。</li><li ${li}><i class="fas fa-user-friends" ${ic}></i> <b>世帯収入UP:</b> 共働きなどで世帯収入を増やす検討を。</li><li ${li}><i class="fas fa-hammer" ${ic}></i> <b>臨時出費:</b> 住宅修繕費など予備費の確保を。</li></ul>`;
    } else if(a === 50) {
        txt = `<p><b>50代: 資産形成「ラストスパート」</b></p><p style="font-size:0.95em; color:#666; margin-top:5px;">子育てがひと段落し、金銭的な余裕が生まれる「貯めどき」が再来します。</p><ul ${ul}><li ${li}><i class="fas fa-piggy-bank" ${ic}></i> <b>資産形成加速:</b> 老後資金へ投資しましょう。</li><li ${li}><i class="fas fa-heartbeat" ${ic}></i> <b>健康リスク:</b> 医療保険の見直しや健康診断を。</li><li ${li}><i class="fas fa-exclamation-triangle" ${ic}></i> <b>役職定年:</b> 給与減に備え生活水準の調整を。</li></ul>`;
    } else if(a === 60) {
        txt = `<p><b>60代: 仕上げと資産確定（出口戦略）</b></p><p style="font-size:0.95em; color:#666; margin-top:5px;">現役生活の集大成です。退職金の使い道と資産の取り崩し計画を立てましょう。</p><ul ${ul}><li ${li}><i class="fas fa-chart-line" ${ic}></i> <b>運用の利益確定:</b> リスク資産から安定資産へシフト。</li><li ${li}><i class="fas fa-home" ${ic}></i> <b>ローン完済:</b> 退職金で完済し固定費削減も手。</li><li ${li}><i class="fas fa-hand-holding-heart" ${ic}></i> <b>再雇用・年金:</b> 働き続けるか否かの決断が必要です。</li></ul>`;
    }
    
    // 3. 画面への反映 (専用ID "age-guidance-..." と "ageGuidanceModal" を使用)
    const titleEl = document.getElementById('age-guidance-title');
    const bodyEl = document.getElementById('age-guidance-text');
    const modalEl = document.getElementById('ageGuidanceModal');

    if (titleEl) titleEl.textContent = `${a}代のプランニング`;
    if (bodyEl) bodyEl.innerHTML = comparisonHtml + txt; 
    if (modalEl) modalEl.style.display = 'flex'; 
}

function closeAgeGuidanceModal() { document.getElementById('ageGuidanceModal').style.display='none'; determineNextGuidance(); }

function determineNextGuidance() {
    let next = null;
    if (gameState.players.player1.needsNewJob || gameState.players.player2.needsNewJob) next = 'newJob';
    else if (!gameState.car.cardScanned) next = 'car';
    else if (!gameState.insurance.cardScanned) next = 'insurance';
    else if (!gameState.turnEventCompleted) next = 'turnEvent';
    showGuidanceModal(next);
}

function showGuidanceModal(key) {
    gameState.currentGuidance = key; 
    const m = document.getElementById('guidanceModal'); 
    if (!key) { if (m) m.style.display = 'none'; return; }
    
    const titles = { 'newJob': '転職活動', 'car': '自動車', 'insurance': '保険', 'turnEvent': 'イベント' };
    document.getElementById('guidance-title').textContent = titles[key] || 'カードスキャン';
    document.getElementById('guidance-text').textContent = getGuidanceText(key);
    
    // 資産パネル更新
    createGuidanceStats(gameState.totalAssets);
    
    const isMulti = ['car', 'insurance', 'turnEvent'].includes(key);
    document.getElementById('guidance-done-button').style.display = isMulti ? 'inline-block' : 'none';
    
    const backBtn = document.getElementById('guidance-back-button');
    if (backBtn) backBtn.style.display = (key === 'insurance' || key === 'turnEvent') ? 'inline-block' : 'none';

    // ▼▼▼ ここが修正ポイント：ボタンの分岐処理 ▼▼▼
    const okBtn = document.getElementById('guidance-ok-button');
    
    if (key === 'newJob') {
        // ★転職のときだけ、スキャンではなく「選択画面」を開くように変更
        okBtn.innerHTML = '<i class="fas fa-briefcase"></i> 職業を選択する';
        okBtn.className = 'btn-primary'; // 色を青に戻す（もし変わっていれば）
        okBtn.onclick = () => {
            m.style.display = 'none';
            openJobSelectionModal(); // 新しい選択画面関数を呼び出す
        };
    } else {
        // ★それ以外は今まで通り「スキャン画面」へ
        okBtn.innerHTML = '<i class="fas fa-camera"></i> スキャン画面へ';
        okBtn.onclick = () => {
            gameState.guidanceContextForApply = key;
            m.style.display = 'none';
            openCamera();
        };
    }
    // ▲▲▲ 修正ここまで ▲▲▲

    // 完了ボタン（複数スキャン用）の処理
    document.getElementById('guidance-done-button').onclick = () => {
        if (key === 'car') gameState.car.cardScanned = true;
        if (key === 'insurance') gameState.insurance.cardScanned = true;
        if (key === 'turnEvent') gameState.turnEventCompleted = true;
        m.style.display = 'none';
        determineNextGuidance();
    };

    m.style.display = 'flex';
}

function getGuidanceText(key) {
    switch(key) {
        case 'newJob': return '新しい職業カードをスキャンしてください';
        case 'car': return '自動車を購入・乗り換える場合はスキャン(複数可)';
        case 'insurance': return '保険に加入・更新する場合はスキャン(複数可)';
        case 'turnEvent': return 'イベントカードを引いてスキャンしてください';
        default: return '指示されたカードをスキャンしてください';
    }
}

// キャリアチャレンジ
function showCareerChallenge(key) {
    gameState.currentPlayerChallenge = key;
    document.getElementById('career-challenge-player-name').textContent = gameState.players[key].name;
    document.getElementById('careerChallengeModal').style.display = 'flex';
}
function handleCareerChoice(choice) {
    const p = gameState.players[gameState.currentPlayerChallenge];

    if (choice === 'skip') {
        proceedToNextPlayerOrEnd();
        return;
    }

    if (p.needsNewJob && choice !== 'skip') { 
        alert("現在求職中のため、スキップされます");
        proceedToNextPlayerOrEnd();
        return;
    }

    document.getElementById('careerChallengeModal').style.display = 'none';

    if (choice === 'jobChange') {
        // ★変更点: まず職業選択画面を開く (isChallengeモード = true)
        alert("【転職チャレンジ】\n目指す職業を選択してください。\n職業の難易度（年収）に応じて成功率が変わります！");
        openJobSelectionModal(true); // true = チャレンジモード
        
    } else if (choice === 'promotion') {
        // 昇格は従来通り (30%成功固定)
        showRoulette("昇格チャレンジ", "緑のエリア(成功)に止まれば、来期の年収がアップします！", 3, function(isSuccess) {
            if (isSuccess) {
                alert("【成功！】おめでとうございます！\n昇格が決まりました。");
                p.promotionSuccess = true;
            } else {
                alert("【失敗...】\n残念ながら現状維持となります。");
            }
            proceedToNextPlayerOrEnd();
        });
    }
}

// 次のプレイヤーに進む、またはターンを開始する共通処理
function proceedToNextPlayerOrEnd() {
    if (gameState.currentPlayerChallenge === 'player1') { 
        showCareerChallenge('player2'); 
    } else {
        // 全員終わったらモーダルを閉じて次のターンへ
        document.getElementById('careerChallengeModal').style.display = 'none';
        gameState.isCareerChallengeActive = false;
        gameState.currentPlayerChallenge = null;
        
        updateStateForNewTurn(); 
        startTurnIncomeAndExpense(gameState.currentAge);
        updateDisplay(); 
        saveGameState(); 
        showAgeGuidanceModal(gameState.currentAge);
    }
}

// 退職金 & 投資ルーレット & 結果表示
function showRetirementBonusModal() {
    const modal = document.getElementById('retirementBonusModal');
    modal.style.display = 'flex';
    
    const noBonusJobs = ['J008', 'J009', 'J010']; 

    ['player1', 'player2'].forEach(key => {
        const player = gameState.players[key];
        const isTarget = !noBonusJobs.includes(player.jobId);
        const scanKey = (key === 'player1') ? 'p1Scanned' : 'p2Scanned';
        
        if (!isTarget) { gameState.retirementBonus[key] = 0; gameState.retirementBonus[scanKey] = true; }

        const statusEl = document.getElementById(`retirement-${key === 'player1' ? 'p1' : 'p2'}-status`);
        const cardEl = document.getElementById(`retirement-${key === 'player1' ? 'p1' : 'p2'}-card`);
        const scanBtn = document.getElementById(`retirement-${key === 'player1' ? 'p1' : 'p2'}-scan-btn`);
        const nameEl = document.getElementById(`retirement-${key === 'player1' ? 'p1' : 'p2'}-name`);

        if (nameEl) nameEl.textContent = player.name;
        cardEl.classList.remove('scanned', 'no-bonus');
        statusEl.classList.remove('scanned');
        scanBtn.style.display = 'inline-block'; 

        if (!isTarget) {
            cardEl.classList.add('no-bonus', 'scanned');
            statusEl.innerHTML = '<i class="fas fa-minus-circle"></i> 対象外';
            statusEl.classList.add('scanned'); 
            scanBtn.style.display = 'none'; 
        } else if (gameState.retirementBonus[scanKey]) {
            cardEl.classList.add('scanned');
            statusEl.innerHTML = `<i class="fas fa-check-circle"></i> ${gameState.retirementBonus[key]}万円`;
            statusEl.classList.add('scanned');
            scanBtn.style.display = 'none'; 
        } else {
            statusEl.innerHTML = '<i class="fas fa-times-circle"></i> 未スキャン';
        }
    });

    const nextBtn = document.getElementById('retirement-next-btn');
    if (gameState.retirementBonus.p1Scanned && gameState.retirementBonus.p2Scanned) { nextBtn.disabled = false; } else { nextBtn.disabled = true; }
    saveGameState();
}

function openRetirementBonusScan(k) { gameState.guidanceContextForApply = (k==='player1')?'retirement_p1':'retirement_p2'; document.getElementById('retirementBonusModal').style.display='none'; openCamera(); }

function showInvestmentRateModal() {
    document.getElementById('retirementBonusModal').style.display='none'; 
    const retirementTotal = gameState.retirementBonus.player1 + gameState.retirementBonus.player2;
    gameState.totalAssets += retirementTotal;
    document.getElementById('finalResultModal').style.display='none'; 
    document.getElementById('investmentRateModal').style.display='flex'; 
    isRouletteRunning = false;
    if(rouletteInterval) clearInterval(rouletteInterval);
    const btn = document.getElementById('rouletteButton');
    const disp = document.getElementById('rouletteDisplay');
    if(btn && disp) {
        disp.textContent = '0%';
        const newBtn = btn.cloneNode(true);
        btn.parentNode.replaceChild(newBtn, btn);
        newBtn.innerHTML = '<i class="fas fa-play"></i> スタート';
        newBtn.className = 'btn-primary';
        newBtn.disabled = false;
        newBtn.onclick = toggleRoulette;
    }
}

function toggleRoulette() {
    const disp = document.getElementById('rouletteDisplay');
    const btn = document.getElementById('rouletteButton');
    if (!isRouletteRunning) {
        isRouletteRunning = true;
        btn.innerHTML = '<i class="fas fa-stop"></i> ストップ';
        btn.className = 'btn-danger';
        rouletteInterval = setInterval(() => { const r = Math.floor(Math.random() * 10); disp.textContent = r + '%'; }, 50);
    } else {
        isRouletteRunning = false;
        clearInterval(rouletteInterval);
        const rate = parseInt(disp.textContent);
        btn.innerHTML = '<i class="fas fa-check"></i> 決定';
        btn.className = 'btn-success';
        btn.disabled = true;
        setTimeout(() => calculateInvestmentResult(rate), 800);
    }
}

function calculateInvestmentResult(ratePercent) {
    const rate = ratePercent / 100;
    let fv = 0, prin = 0;
    gameState.investment.tsumitateLog.forEach(l => { 
        const y = l.endAge - l.startAge; const p = l.amount * y; prin += p; 
        const yearsToInvest = 65 - l.startAge - (y / 2);
        let val = p;
        if (rate !== 0) val = p * Math.pow(1 + rate, yearsToInvest);
        fv += val; 
    });
    gameState.investment.ikkatsuLog.forEach(l => { 
        prin += l.amount; let val = l.amount;
        const years = 65 - l.startAge;
        if (rate !== 0) val = l.amount * Math.pow(1 + rate, years);
        fv += val; 
    });
    fv = Math.round(fv);
    const bef = gameState.totalAssets;
    gameState.totalAssets = bef + fv; 
    gameState.finalInvestmentResult = { rate: ratePercent, principal: prin, fv, gain: fv - prin, assetsBefore: bef, finalAssets: gameState.totalAssets };
    document.getElementById('investmentRateModal').style.display = 'none';
    const resDiv = document.getElementById('investmentResultSummary');
    if(resDiv) {
        const diff = fv - prin;
        const diffClass = diff >= 0 ? 'invest-val-gain' : 'invest-val-loss';
        const diffSign = diff >= 0 ? '+' : '';
        resDiv.innerHTML = `<div class="investment-summary-container"><div class="invest-rate-header"><span class="invest-rate-label">運用年利</span><span class="invest-rate-value">${ratePercent}%</span></div><div class="invest-row"><span class="invest-label">投資元本</span><span class="invest-val">${prin.toLocaleString()}万円</span></div><div class="invest-row"><span class="invest-label">最終評価額</span><span class="invest-val">${fv.toLocaleString()}万円</span></div><div class="invest-row total-row"><span class="invest-label">運用損益</span><span class="${diffClass}">${diffSign}${diff.toLocaleString()}万円</span></div></div>`;
    }
    document.getElementById('investmentResultModal').style.display = 'flex';
}

function showFinalAssets() { document.getElementById('investmentResultModal').style.display='none'; showLifePlanKarte(); }
function showLifePlanKarte() {
    document.getElementById('karte-marriage').textContent = gameState.marriage.type;
    document.getElementById('karte-house').textContent = gameState.house.type;
    document.getElementById('karte-children').textContent = gameState.children.count + "人";
    const carNames = gameState.car.cards.map(c => c.title.replace("自動車🚗 - ", "").replace("クラス", "")).join(", ");
    document.getElementById('karte-car').textContent = carNames || "なし";
    
    document.getElementById('karte-assets').textContent = Math.round(gameState.totalAssets).toLocaleString() + "万円";
    document.getElementById('karte-happiness').textContent = gameState.happiness + " pt";

    const assetScore = Math.floor(gameState.totalAssets / 10);
    const happinessScore = gameState.happiness;
    const totalScore = assetScore + happinessScore;

    document.getElementById('karte-score').textContent = totalScore;

    let rankTitle = "";
    let advice = "";

    if (totalScore >= 700) {
        rankTitle = "Sランク: 伝説のライフプランナー";
        advice = "素晴らしい結果です！資産の確保と人生の充実（思い出作り）を極めて高いレベルで両立させました。";
    } else if (totalScore >= 600) {
        rankTitle = "Aランク: 理想的な人生設計";
        advice = "とても優秀なスコアです。老後の安心とお楽しみのバランスが良く取れています。";
    } else if (totalScore >= 400) {
        rankTitle = "Bランク: 堅実なバランス型";
        advice = "平均以上の良い結果です！大きな破綻なく、人生のイベントも楽しむことができました。";
    } else if (totalScore >= 200) {
        rankTitle = "Cランク: 平均的なプラン";
        advice = "まずまずの結果です。生活は守れましたが、少し「守り」に入りすぎたかもしれません。";
    } else if (totalScore >= 100) {
        rankTitle = "Dランク: これから伸びるタイプ";
        advice = "今回は少し厳しい結果になりました。シミュレーションで「何にお金がかかるか」を学べたのが最大の収穫です。";
    } else {
        rankTitle = "Eランク: 要努力";
        advice = "厳しい結果となりました。現実では固定費（保険や住居費）の見直しが重要です。";
    }

    document.getElementById('karte-rank-title').textContent = rankTitle;
    document.getElementById('karte-advice-text').innerHTML = advice;
   
   // ▼▼▼ 修正：URLパラメータによる完全自動連携 ▼▼▼

    // 1. ユニークな診断コード生成
    const diagnosisId = Math.floor(100000 + Math.random() * 900000);

    // 2. データ保存
    const finalDiagnosisData = {
        age: currentAge,
        p1Income: players.player1.income,
        p2Income: players.player2.income,
        householdIncome: Math.floor(players.player1.income + players.player2.income),
        savings: totalAssets,
        monthlyLiving: Math.floor(currentLivingCost / 12),
        monthlyHousing: Math.floor(housingCost / 12),
        monthlyEducation: Math.floor(educationCost / 12),
        monthlyCar: Math.floor(carCost / 12),
        monthlyInsurance: Math.floor(insuranceCost / 12),
        isMarried: isMarried,
        childrenCount: childrenCount,
        roomId: roomIdInput ? roomIdInput.value : "unknown",
        diagnosisId: diagnosisId,
        savedAt: firebase.database.ServerValue.TIMESTAMP
    };

    if(database) {
        database.ref('diagnosis/' + diagnosisId).set(finalDiagnosisData);
    }
    
    // 3. ボタンのリンク先を「ID付きの診断シート」に変更
    const lineBtn = document.getElementById('line-connect-btn');
    
    if(lineBtn) {
        // ★ここがポイント：URLの後ろに ?uid=数字 をつける
        const directLink = `diagnosis.html?uid=${diagnosisId}`;
        
        lineBtn.href = directLink;
        lineBtn.target = "_blank";
        lineBtn.onclick = null; 
        
        // 念のためコード表示エリアも作成（保険）
        const btnContainer = lineBtn.parentNode;
        const existingCode = document.getElementById('diagnosis-code-display');
        if(existingCode) existingCode.remove();

        const codeDiv = document.createElement('div');
        codeDiv.id = 'diagnosis-code-display';
        codeDiv.style.marginBottom = '10px';
        codeDiv.innerHTML = `
            <p style="font-size:0.8em; color:#666;">
                診断コード: <strong>${diagnosisId}</strong><br>
                (ボタンを押せば自動で連携されます)
            </p>
        `;
        btnContainer.insertBefore(codeDiv, lineBtn);
    }
    document.getElementById('lifePlanKarteModal').style.display = 'flex';
}

function showExplanation() { 
    let t = '解説なし';
    
    if (lastScannedCardId && CARD_DATA[lastScannedCardId]) {
        const c = CARD_DATA[lastScannedCardId];
        t = c.explanation || '解説なし';

        // ★退職金トリガーの場合は、対象者の詳細カードの解説を見に行く
        if (c.type === 'retirement_trigger') {
            const guid = gameState.guidanceContextForApply || gameState.currentGuidance;
            let pKey = (guid === 'retirement_p1') ? 'player1' : (guid === 'retirement_p2' ? 'player2' : null);
            
            if (pKey) {
                const p = gameState.players[pKey];
                // 退職金対象外の職業かどうか
                if (!p.jobId || ['J008','J009','J010'].includes(p.jobId)) {
                    // 対象外用の汎用メッセージ、または元のRTカードの解説を表示
                    t = c.explanation; 
                } else {
                    // 対象者の職業IDとレベル(S/M/H)から詳細カードIDを生成 (例: R001H)
                    const tId = 'R' + p.jobId.substring(1) + c.level;
                    if (CARD_DATA[tId] && CARD_DATA[tId].explanation) {
                        t = CARD_DATA[tId].explanation; // 詳細解説に上書き
                    }
                }
            }
        }
    }
    
    document.getElementById('card-explanation').innerHTML = t; 
    document.getElementById('explanationModal').style.display = 'flex'; 
}
function closeExplanationModal() { document.getElementById('explanationModal').style.display = 'none'; }
function showNetIncomeModal(p,g,d) { document.getElementById('net-income-player-name').textContent=p.name; document.getElementById('net-income-gross').textContent=g+'万円'; document.getElementById('net-income-net').textContent=d.net+'万円'; document.getElementById('netIncomeModal').style.display='flex'; }

function showDeductionDetailsModal() { const d = gameState.tempDeductions; if(!d)return; document.getElementById('deduction-health').textContent = `-${d.health}万円`; document.getElementById('deduction-pension').textContent = `-${d.pension}万円`; document.getElementById('deduction-employment').textContent = `-${d.employment}万円`; document.getElementById('deduction-income-tax').textContent = `-${d.incomeTax}万円`; document.getElementById('deduction-resident-tax').textContent = `-${d.residentTax}万円`; document.getElementById('deduction-total').textContent = `-${d.total}万円`; document.getElementById('deductionDetailsModal').style.display='flex'; }
function closeDeductionDetailsModal() { document.getElementById('deductionDetailsModal').style.display='none'; }
function resetGame() { if(confirm("リセットしますか？\n現在の進行状況は失われます。")) { localStorage.clear(); location.reload(); } }
function saveAndExitGame() { saveToHallOfFame(); localStorage.removeItem('gameStarted'); localStorage.removeItem(BALANCE_HISTORY_KEY); localStorage.removeItem(GAME_STATE_KEY); alert("保存しました。タイトルに戻ります。"); location.reload(); }
function saveToHallOfFame() { if(!gameState.finalInvestmentResult) return; const e = { id: new Date().toISOString(), timestamp: new Date().toLocaleString('ja-JP'), finalAssets: gameState.totalAssets, happiness: gameState.happiness, player1Name: gameState.players.player1.name, player2Name: gameState.players.player2.name, marriage: gameState.marriage.type, children: gameState.children.count, house: gameState.house.type, balanceHistory: gameState.balanceHistory, finalInvestmentResult: gameState.finalInvestmentResult }; try { const d = localStorage.getItem(HALL_OF_FAME_KEY); let l = d ? JSON.parse(d) : []; l.push(e); l.sort((a,b)=>b.finalAssets-a.finalAssets); localStorage.setItem(HALL_OF_FAME_KEY, JSON.stringify(l.slice(0,10))); } catch(e){} }
function showHallOfFame() { const m = document.getElementById('hallOfFameModal'); const c = document.getElementById('hallOfFameContainer'); c.innerHTML = ''; try { const d = localStorage.getItem(HALL_OF_FAME_KEY); const l = d ? JSON.parse(d) : []; if(l.length===0) c.innerHTML = '<p style="text-align:center">データなし</p>'; l.forEach(e => { c.innerHTML += `<div class="hof-entry"><div class="assets">${Math.round(e.finalAssets)}<span>万円</span><br><small style="color:#e53e3e">❤️${e.happiness||0}</small></div><div class="details"><p>${e.timestamp}</p><p>${e.player1Name}, ${e.player2Name}</p></div><div class="hof-controls"><button class="btn-secondary btn-small" onclick="showSavedBalanceDetails('${e.id}')">詳細</button><button class="btn-danger btn-small" onclick="deleteSavedEntry('${e.id}')">削除</button></div></div>`; }); } catch(e){} m.style.display = 'flex'; }
function deleteSavedEntry(id) { if(!confirm("削除しますか？")) return; const l = JSON.parse(localStorage.getItem(HALL_OF_FAME_KEY)||'[]').filter(e=>e.id!==id); localStorage.setItem(HALL_OF_FAME_KEY, JSON.stringify(l)); showHallOfFame(); }
function closeHallOfFameModal() { document.getElementById('hallOfFameModal').style.display='none'; }
function showSavedBalanceDetails(id) { const e = JSON.parse(localStorage.getItem(HALL_OF_FAME_KEY)||'[]').find(x=>x.id===id); if(e) showFinalBalanceDetails(e.balanceHistory); }
function closeNetIncomeModal() { 
    document.getElementById('netIncomeModal').style.display = 'none'; 
    recalculateAnnualExpense(); 
    updateDisplay(); 
    
    // ▼▼▼ 修正: 状況に応じて行き先を変える ▼▼▼
    if (gameState.isCareerChallengeActive) {
        // キャリアチャレンジ中の転職なら、チャレンジの続き（次の人 or 年代開始）へ
        proceedToNextPlayerOrEnd();
    } else {
        // 通常のターン中の転職なら、次のガイダンス（車など）へ
        determineNextGuidance();
    }
    // ▲▲▲ 修正ここまで ▲▲▲
}
// ▼▼▼ 修正: showBalance を showFinalBalanceDetails に変更し、引数に対応 ▼▼▼
function showFinalBalanceDetails(historyOverride) {
    // 大きい方のモーダル（finalBalanceModal）を使用します
    const m = document.getElementById('finalBalanceModal'); 
    const c = document.getElementById('finalBalanceDetailsContainer'); 
    c.innerHTML = '';

    // 引数(過去ログ)があればそれを使い、なければ現在のゲーム履歴を使う
    const historyData = historyOverride || gameState.balanceHistory;

    let html = '';

    // --- 1. 現在の状況 (現在のゲームプレイ中のみ表示) ---
    // historyOverrideがない(=null)場合は、現在のゲーム状況を表示
    if (!historyOverride) {
        const currentInc = gameState.players.player1.income + gameState.players.player2.income;
        const currentExp = gameState.annualExpense;
        const currentYearBalance = currentInc - currentExp;

        html += `
            <div style="background:#e6fffa; padding:15px; border-radius:10px; border:2px solid #48bb78; margin-bottom:20px;">
                <h3 style="color:#2f855a; margin:0 0 10px 0; border-bottom:1px dashed #48bb78; padding-bottom:5px;">
                    <i class="fas fa-chart-pie"></i> 現在の家計状況 (${gameState.currentAge}代)
                </h3>
                <div style="display:grid; grid-template-columns:1fr 1fr; gap:10px; font-size:1.1em;">
                    <div>世帯手取り: <span style="color:#48bb78; font-weight:bold;">+${currentInc}万円</span></div>
                    <div>年間支出: <span style="color:#e53e3e; font-weight:bold;">-${currentExp}万円</span></div>
                    <div style="grid-column:1/-1; border-top:1px solid #ccc; margin-top:5px; padding-top:5px; font-weight:bold;">
                        年間収支: ${currentYearBalance >= 0 ? '+' : ''}${currentYearBalance}万円
                    </div>
                </div>
            </div>`;
    }

    html += '<h3 style="border-left:5px solid #FF7F50; padding-left:10px; margin-bottom:15px;">これまでの履歴</h3>';

    // --- 2. 過去の履歴 (アコーディオン表示) ---
    if (!historyData || historyData.length === 0) {
        html += '<p style="text-align:center; color:#666;">まだ履歴がありません。</p>';
    } else {
        historyData.forEach((e) => {
            const years = e.years || ((e.age === 60) ? 5 : 10);
            html += `
            <details class="balance-detail-card">
                <summary class="balance-summary">
                    <span class="age-label">${e.age}代 (${years}年間)</span>
                    <span class="diff-label ${e.finalDiff >= 0 ? 'plus' : 'minus'}">
                        ${e.finalDiff >= 0 ? '+' : ''}${Math.round(e.finalDiff)}<small>万円</small>
                    </span>
                </summary>
                <div class="balance-content">
                    <div class="balance-row main-row">
                        <span class="label">期間収入</span>
                        <span class="value val-income">+${(e.income * years).toLocaleString()}</span>
                    </div>
                    <div class="balance-row main-row">
                        <span class="label">期間固定費</span>
                        <span class="value val-expense">-${(e.expense * years).toLocaleString()}</span>
                    </div>
                    <div class="balance-row main-row">
                        <span class="label">一時的な収支</span>
                        <span class="value ${e.oneTimeExpenses > 0 ? 'val-expense' : 'val-income'}">
                            ${e.oneTimeExpenses > 0 ? '-' : '+'}${Math.abs(e.oneTimeExpenses).toLocaleString()}
                        </span>
                    </div>
                    <div class="balance-row main-row" style="border-top:2px solid #eee; margin-top:5px; padding-top:10px;">
                        <span class="label">終了時資産</span>
                        <span class="value">${Math.round(e.assetsAtEnd).toLocaleString()}万円</span>
                    </div>
                </div>
            </details>`;
        });
    }

    c.innerHTML = html;
    m.style.display = 'flex';
}
// ▲▲▲ 修正ここまで ▲▲▲
function closeFinalBalanceModal() { document.getElementById('finalBalanceModal').style.display='none'; }
function showHistoryGraph() { 
    const m = document.getElementById('finalGraphModal'); 
    const ctx = document.getElementById('finalBalanceChart'); 
    
    if(!ctx) return; 
    
    // 履歴データを取得
    const h = gameState.balanceHistory; 
    
    // X軸ラベル (初期 + 年代)
    const labels = ["初期(30歳)", ...h.map(e => `${e.age}代終了`)]; 
    
    // データポイント (初期資産100万 + 各年代終了時の資産)
    // ※修正1で assetsAtEnd を保存するようにしたので、それを読み取ります
    const data = [100, ...h.map(e => e.assetsAtEnd || 0)]; 

    // 既存のチャートがあれば破棄
    if(finalBalanceChartInstance) finalBalanceChartInstance.destroy(); 
    
    // チャート描画
    finalBalanceChartInstance = new Chart(ctx.getContext('2d'), { 
        type: 'line', 
        data: { 
            labels: labels, 
            datasets: [{ 
                label: '総資産(万円)', 
                data: data, 
                borderColor: '#FF7F50', // サーモンピンク
                backgroundColor: 'rgba(255, 127, 80, 0.2)',
                borderWidth: 3,
                tension: 0.1,
                pointRadius: 5,
                fill: true
            }] 
        }, 
        options: { 
            responsive: true, 
            maintainAspectRatio: false,
            scales: {
                y: {
                    beginAtZero: false,
                    grid: { color: '#f0f0f0' }
                },
                x: {
                    grid: { display: false }
                }
            }
        } 
    }); 
    
    m.style.display = 'flex'; 
}
function closeFinalGraphModal() { document.getElementById('finalGraphModal').style.display='none'; }

// 初期化
document.addEventListener('DOMContentLoaded', () => {
    if (loadGameState()) {
        document.getElementById('titleScreen').style.display = 'none';
        document.getElementById('mainGameContainer').style.display = 'block';
        updateDisplay();
        if(gameState.currentAge >= 70) {
            if (!gameState.finalInvestmentResult) showRetirementBonusModal();
            else showLifePlanKarte();
        } else {
            determineNextGuidance();
        }
    }
});
// ==========================================
// ▼▼▼ 新ルーレットシステム (10分割対応) ▼▼▼
// ==========================================

// 転職チャレンジ開始（選択画面から呼ばれる）
function startJobChangeChallenge(jobId) {
    // モーダルを閉じる
    document.getElementById('jobSelectionModal').style.display = 'none';

    const rate = JOB_SUCCESS_RATE[jobId] || 5; // デフォルト5割
    const jobName = CARD_DATA[jobId].title.replace('職業: ', '');

    if (rate >= 10) {
        // 100%の場合はルーレットなしで即成功
        alert(`【${jobName}】への転職は確実に成功します！`);
        // 転職実行のための一時IDセット（念のため）
        tempSelectedNewJobId = jobId; 
        executeJobChange(); // 転職実行
        // ※executeJobChange内でモーダルを閉じたりログ出したりするが、
        // キャリアチャレンジ中の進行処理(proceedToNext...)が必要なので、
        // executeJobChangeの後に呼ぶ必要がある。
        // ただし executeJobChange は「通常時」も使うので、
        // ここでは単純に「成功扱い」として処理を進める。
        
        // executeJobChangeは画面リロード的な動きを含むので、
        // その後に proceedToNextPlayerOrEnd を呼ぶと二重になる可能性がある。
        // なので、executeJobChange の最後で「もしキャリアチャレンジ中なら次へ」という分岐を入れるのがベスト。
        // (前回の修正で closeNetIncomeModal にその分岐を入れたので、ここでは executeJobChange だけでOK)
        return;
    }

    // ルーレット表示 (確率を渡す)
    showRoulette(
        "転職チャレンジ", 
        `【${jobName}】への転職 (成功率 ${rate*10}%)`, 
        rate, 
        function(isSuccess) {
            if (isSuccess) {
                alert(`【成功！】\nおめでとうございます！\n${jobName}への転職が決まりました。`);
                // 転職実行 (tempSelectedNewJobId は選択画面でセット済み)
                executeJobChange(); 
                // executeJobChange -> 手取り画面 -> 閉じる -> proceedToNext... の流れになる
            } else {
                alert("【失敗...】\n残念ながら不採用となりました。\n現在の職業を継続します。");
                // 失敗時は転職を実行せずに次へ進む
                proceedToNextPlayerOrEnd(); 
            }
        }
    );
}

// 汎用ルーレット表示関数 (successRate: 1〜10)
let currentRouletteRate = 5; // 現在の確率を保存
function showRoulette(title, description, successRate, callback) {
    const modal = document.getElementById('rouletteModal');
    const wheel = document.getElementById('rouletteWheel');
    const startBtn = document.getElementById('startRouletteBtn');
    
    document.getElementById('rouletteTitle').textContent = title;
    document.getElementById('rouletteDescription').textContent = description;
    
    currentRouletteRate = successRate;

    // ▼CSSを動的に書き換えて「成功エリア(緑)」の広さを変える
    // successRateが 3 なら、30%が緑、70%が赤
    const percentage = successRate * 10; 
    wheel.style.background = `conic-gradient(
        #48bb78 0% ${percentage}%, 
        #e53e3e ${percentage}% 100%
    )`;

    // 盤面の角度をリセット
    wheel.style.transition = 'none';
    wheel.style.transform = 'rotate(0deg)';
    wheel.offsetHeight; // リフロー
    wheel.style.transition = ''; 

    modal.style.display = 'flex';
    gameState.isRouletteSpinning = false;

    startBtn.disabled = false;
    startBtn.onclick = function() {
        if (gameState.isRouletteSpinning) return;
        spinRouletteDynamic(callback);
    };
}

// 動的ルーレット回転処理
function spinRouletteDynamic(callback) {
    gameState.isRouletteSpinning = true;
    const wheel = document.getElementById('rouletteWheel');
    const startBtn = document.getElementById('startRouletteBtn');
    startBtn.disabled = true;

    // 最低5回転(1800度) + ランダムな角度(0-360度)
    const extraSpins = 5;
    const randomAngle = Math.floor(Math.random() * 360);
    const totalRotation = (360 * extraSpins) + randomAngle;

    // 回転アニメーション
    wheel.style.transform = `rotate(${totalRotation}deg)`;

    // 4.1秒後に判定
    setTimeout(() => {
        gameState.isRouletteSpinning = false;
        startBtn.disabled = false;
        document.getElementById('rouletteModal').style.display = 'none';

        // 停止位置の角度 (0-360)
        // 矢印は上(0度)にあると仮定。
        // CSSの rotate がプラス回転(時計回り)なので、
        // 矢印の真下に来る「盤面の角度」は (360 - (total % 360)) % 360
        const finalTransform = totalRotation % 360;
        const angleUnderArrow = (360 - finalTransform) % 360;

        // 成功エリアは 0度 〜 (successRate * 36)度 まで
        // 例: 成功率3(30%)なら、0〜108度が当たり
        const successAngleLimit = currentRouletteRate * 36; // 1目盛り36度

        const isSuccess = (angleUnderArrow < successAngleLimit);

        console.log(`Rate:${currentRouletteRate}, Angle:${angleUnderArrow.toFixed(1)}, Limit:${successAngleLimit}, Result:${isSuccess}`);

        if (callback) callback(isSuccess);

    }, 4100);
}
// ==========================================
// ▼▼▼ 【追加】画面上での転職選択システム ▼▼▼
// ==========================================

let tempSelectedNewJobId = 'J001'; // 選択中の職業ID

// 職業選択モーダルを開く (isChallenge = true なら転職試験モード)
let isJobChallengeMode = false; // フラグ

function openJobSelectionModal(isChallenge = false) {
    isJobChallengeMode = isChallenge; // モードを記憶
    
    const modal = document.getElementById('jobSelectionModal');
    const container = document.getElementById('jobSelectContainer');
    const confirmBtn = document.getElementById('confirmJobChangeBtn');
    
    if(!container) return;
    container.innerHTML = '';
    
    // 専業主婦(J010)も含める
    const jobs = Object.keys(CARD_DATA)
        .filter(key => CARD_DATA[key].type === 'job') 
        .map(key => ({ id: key, ...CARD_DATA[key] }));

    let currentIndex = 0;
    tempSelectedNewJobId = jobs[0].id;

    // スライダーUI作成
    const wrapper = document.createElement('div');
    wrapper.className = 'slider-container';
    
    const prevBtn = document.createElement('button');
    prevBtn.className = 'slider-btn';
    prevBtn.innerHTML = '<i class="fas fa-chevron-left"></i>';
    
    const cardEl = document.createElement('div');
    cardEl.className = 'selection-card active';
    
    const nextBtn = document.createElement('button');
    nextBtn.className = 'slider-btn';
    nextBtn.innerHTML = '<i class="fas fa-chevron-right"></i>';

    const infoEl = document.createElement('div');
    infoEl.style.marginTop = '15px';
    infoEl.style.fontWeight = 'bold';
    infoEl.style.textAlign = 'center';

    function updateView() {
        const item = jobs[currentIndex];
        tempSelectedNewJobId = item.id;
        
        let visual = item.image ? `<img src="${item.image}" class="job-image">` : `<i class="fas fa-briefcase" style="font-size:4em; color:#FF7F50;"></i>`;
        
        // 30代の給与を取得
        const startSalary = item.salary[30];
        const net = getNetIncomeDetails(startSalary).net;
        
        // ★追加: 成功率の表示ロジック
        let rateInfo = "";
        let btnText = "この職業に決定";
        let btnColor = "btn-primary";

        if (isJobChallengeMode) {
            const rate = JOB_SUCCESS_RATE[item.id] || 5;
            const percent = rate * 10;
            let difficultyText = "";
            if (rate <= 2) difficultyText = "【難関】";
            else if (rate <= 5) difficultyText = "【普通】";
            else if (rate >= 10) difficultyText = "【確実】";

            rateInfo = `<div style="margin-top:10px; padding:5px; background:#fff; border:2px solid #FF7F50; border-radius:10px; color:#e53e3e;">
                ${difficultyText} 成功率: ${percent}%<br>
                <small>(10回中 ${rate}回成功)</small>
            </div>`;
            btnText = "この職業に挑戦！";
            btnColor = "btn-danger"; // 色を変えて挑戦感を出す
        }

        cardEl.innerHTML = `
            ${visual}
            <h4 style="margin-top:10px;">${item.title.replace('職業: ', '')}</h4>
        `;
        
        infoEl.innerHTML = `
            <div style="color:#2b6cb0;">額面年収: ${startSalary}万円</div>
            <div style="color:#48bb78; font-size:1.1em;">手取り: 約${net}万円</div>
            <div style="font-size:0.8em; color:#666; margin-bottom:5px;">(※30代水準から再スタート)</div>
            ${rateInfo}
            <button onclick="showLocalExplanation('${item.id}')" style="${infoButtonStyle}">
                <i class="fas fa-info-circle"></i> 解説を見る
            </button>
        `;
        
        confirmBtn.textContent = btnText;
        confirmBtn.className = btnColor;
        
        // ★変更: ボタンを押したときの挙動を分岐
        confirmBtn.onclick = () => {
            if (isJobChallengeMode) {
                startJobChangeChallenge(tempSelectedNewJobId);
            } else {
                executeJobChange();
            }
        };
    }

    prevBtn.onclick = () => { currentIndex = (currentIndex - 1 + jobs.length) % jobs.length; updateView(); };
    nextBtn.onclick = () => { currentIndex = (currentIndex + 1) % jobs.length; updateView(); };

    wrapper.appendChild(prevBtn);
    wrapper.appendChild(cardEl);
    wrapper.appendChild(nextBtn);
    container.appendChild(wrapper);
    container.appendChild(infoEl);

    updateView();
    modal.style.display = 'flex';
}

// 転職実行処理
function executeJobChange() {
    const pKey = gameState.players.player1.needsNewJob ? 'player1' : 'player2';
    const p = gameState.players[pKey];
    const newJobId = tempSelectedNewJobId;
    const jobData = CARD_DATA[newJobId];

    if (!jobData) return;

    // 1. 職業更新
    p.jobId = newJobId;
    p.job = jobData.title;
    p.needsNewJob = false;

    // 2. ★重要: キャリア年齢を30歳にセット
    p.careerAge = 30;

    // ▼▼▼ 追加: 転職したら過去の昇格ボーナスはリセット ▼▼▼
    p.promotionBonus = 0; 
    // ▲▲▲ 追加ここまで ▲▲▲

    // 3. 給与を30代水準で適用
    const startSalary = jobData.salary[30];
    p.grossIncome = startSalary;

    // 4. メッセージとログ
    alert(`【転職完了】\n新しい職業: ${jobData.title}\n年収: ${startSalary}万円 (30代水準) から再出発します！\n※次の年代では昇給のチャンスがあります。`);
    addEvent(`${p.name}は${jobData.title}に転職しました。(キャリアリセット: 年収${startSalary}万円)`);

    // 5. 画面更新 & 終了
    updateDisplay();
    document.getElementById('jobSelectionModal').style.display = 'none';
    
    stopScan(); // 念のためカメラ停止
    
    // 手取り詳細を見せる
    const netDetails = getNetIncomeDetails(startSalary);
    showNetIncomeModal(p, startSalary, netDetails);
}
// ▼▼▼ 修正版: 出産・育児支援の案内画面 (第3子増額対応) ▼▼▼
function showChildAllowanceModal(count) {
    const modal = document.getElementById('localExplanationModal');
    const titleEl = document.getElementById('localExplTitle');
    const bodyEl = document.getElementById('localExplBody');
    const closeBtn = document.getElementById('localExplCloseBtn');

    // 計算
    const birthBenefit = 50 * count; // 出産一時金

    // 児童手当計算 (第3子増額)
    let allowanceAnnual = 0;
    let allowanceNote = ""; // 注釈用

    if (count === 1) {
        allowanceAnnual = 12;
    } else if (count === 2) {
        allowanceAnnual = 24;
    } else if (count === 3) {
        allowanceAnnual = 60; // 12+12+36
        allowanceNote = "<br><span style='font-size:0.8em; color:#e53e3e;'>※第3子増額（月3万円）が適用されています！</span>";
    }

    // 画面作成
    titleEl.innerHTML = '<i class="fas fa-baby" style="color:#FF7F50;"></i> 子育て応援！支援のお知らせ';
    
    bodyEl.innerHTML = `
        <div style="text-align:center; padding:10px;">
            <p style="margin-bottom:20px; font-size:1.1em;">
                お子様の誕生おめでとうございます！<br>
                国から以下の支援を受け取ることができます。
            </p>

            <div style="background:#f0fff4; border:2px solid #48bb78; border-radius:10px; padding:15px; margin-bottom:15px; box-shadow:0 2px 5px rgba(0,0,0,0.1);">
                <div style="color:#2f855a; font-weight:bold; font-size:1.2em; margin-bottom:5px;">
                    <i class="fas fa-gift"></i> 出産育児一時金
                </div>
                <div style="font-size:2em; color:#e53e3e; font-weight:bold; font-family:'Black Ops One', sans-serif;">
                    +${birthBenefit}<span style="font-size:0.5em;">万円</span>
                </div>
                <div style="font-size:0.9em; color:#555;">(総資産に即時加算されます)</div>
            </div>

            <div style="background:#ebf8ff; border:2px solid #4299e1; border-radius:10px; padding:15px; margin-bottom:20px; box-shadow:0 2px 5px rgba(0,0,0,0.1);">
                <div style="color:#2b6cb0; font-weight:bold; font-size:1.2em; margin-bottom:5px;">
                    <i class="fas fa-hand-holding-heart"></i> 児童手当
                </div>
                <div style="font-size:1.1em; margin-bottom:5px;">
                    教育費の補助として <span style="color:#e53e3e; font-weight:bold;">毎年 ${allowanceAnnual}万円</span> 支給
                    ${allowanceNote}
                </div>
                <div style="font-size:0.9em; color:#555;">(30代の間、自動的に適用されます)</div>
            </div>

            <button onclick="showChildSupportDetail()" style="margin-bottom:10px; background-color:#00BFFF; color:white; border:none; padding:12px 25px; border-radius:25px; font-weight:bold; cursor:pointer; box-shadow:0 4px 6px rgba(0,0,0,0.1);">
                <i class="fas fa-book-open"></i> 制度の詳細（解説）を見る
            </button>
        </div>
    `;

    closeBtn.textContent = "受け取って次へ";
    closeBtn.className = "btn-primary";
    
    closeBtn.onclick = function() {
        modal.style.display = 'none';
        
        gameState.totalAssets += birthBenefit;
        addEvent(`出産祝い金として${birthBenefit}万円を受け取りました。`);
        
        const nextBtn = document.getElementById('makeNextBtn');
        nextBtn.onclick = nextMakeStep; 
        nextMakeStep();
    };

    modal.style.display = 'flex';
}
// ▼▼▼ 修正版: 解説文 (第3子増額の記述追加) ▼▼▼
function showChildSupportDetail() {
    const modal = document.getElementById('guidanceModal');
    const title = document.getElementById('guidance-title'); 
    const body = document.getElementById('guidance-text');
    const assetPanel = document.getElementById('guidance-asset-panel-container');
    const okBtn = document.getElementById('guidance-ok-button');
    const doneBtn = document.getElementById('guidance-done-button');
    const backBtn = document.getElementById('guidance-back-button');

    modal.style.zIndex = '3000';

    if(title) title.textContent = "子育て支援制度について";
    
    if(assetPanel) assetPanel.style.display = 'none';
    if(doneBtn) doneBtn.style.display = 'none';
    if(backBtn) backBtn.style.display = 'none';

    if(body) {
        body.innerHTML = `
            <div style="text-align:left; line-height:1.6; max-height:60vh; overflow-y:auto; padding:0 10px;">
                <h4 style="color:#2f855a; border-bottom:1px solid #ccc; padding-bottom:5px; margin-top:0;">🎁 出産育児一時金</h4>
                <p style="font-size:0.95em;">
                    <strong>【概要】</strong><br>
                    出産にかかる経済的負担を軽減するために、健康保険から支給されるお金です。<br>
                    <strong>【支給額】</strong><br>
                    子ども1人につき<strong>50万円</strong>。<br>
                    <span style="font-size:0.85em; color:#666;">(ゲーム内では総資産に即時加算されます)</span>
                </p>

                <h4 style="color:#2b6cb0; border-bottom:1px solid #ccc; padding-bottom:5px; margin-top:20px;">🏫 児童手当</h4>
                <p style="font-size:0.95em;">
                    <strong>【概要】</strong><br>
                    次代の社会を担う児童の健やかな成長を支援するための手当です。<br>
                    <strong>【支給対象】</strong><br>
                    0歳から18歳（高校生年代）まで。<br>
                    <strong>【ゲーム内の反映】</strong><br>
                    制度改正（2024年10月）を反映し、以下の金額で計算しています。<br>
                    <ul>
                        <li><strong>第1子・第2子：</strong> 月額1万円 (年額12万円)</li>
                        <li style="color:#e53e3e; font-weight:bold;"><strong>第3子以降：</strong> 月額3万円 (年額36万円)</li>
                    </ul>
                    <br>
                    ※30代（10年間）と40代（8年間）に分けて教育費から支給分を割引（補助）しています。
                </p>
                <p class="source-text" style="font-size:0.8em; color:#888; text-align:right; margin-top:15px;">
                    出典：厚生労働省、こども家庭庁等の資料を基に作成
                </p>
            </div>
        `;
    }

    if(okBtn) {
        okBtn.innerHTML = "閉じる";
        okBtn.onclick = function() {
            modal.style.display = 'none';
            modal.style.zIndex = ''; 
            if(assetPanel) assetPanel.style.display = 'block';
        };
    }
    
    modal.style.display = 'flex';
}
// ==========================================================
// ▼▼▼ 修正版: 公式LINE登録リンク生成 (データ送信なし) ▼▼▼
// ==========================================================
function prepareLineDiagnosisData() {
    // ★重要: ここをご自身の公式LINEのID（@...）に変更してください
    const lineId = "@480gjare"; 

    // 友だち追加画面を開くURL (https://line.me/R/ti/p/{LINE_ID})
    // ※ID検索用URLスキームを使用
    return `https://line.me/R/ti/p/${lineId}`;
}
