/**
 * game.js - 생태계 탐정단 핵심 게임 로직 & 이벤트 핸들러
 * - "CO2" -> "이산화 탄소" 용어 100% 완전 변경
 * - Web Audio API (Sound.bgm, Sound.sfx, Sound.jingle) 연동
 * - 도트 그래픽 (PixelArt 스프라이트 + AI 16비트 배경) 연동
 * - 태블릿 (갤럭시탭 S7 FE) 터치 제스처 최적화
 */

(function() {
  'use strict';

  var $ = function(id) { return document.getElementById(id); };

  // 타이머 관리
  var TM = [];
  function every(f, t) { var h = setInterval(f, t); TM.push(h); return h; }
  function after(f, t) { var h = setTimeout(f, t); TM.push(h); return h; }
  function clearT() {
    TM.forEach(function(h) { clearInterval(h); clearTimeout(h); });
    TM = [];
  }
  function shuf(a) {
    var arr = a.slice();
    for (var i = arr.length - 1; i > 0; i--) {
      var j = Math.floor(Math.random() * (i + 1));
      var temp = arr[i]; arr[i] = arr[j]; arr[j] = temp;
    }
    return arr;
  }

  function toast(m) {
    var t = $("toast");
    t.textContent = m;
    t.style.display = "block";
    clearTimeout(toast.h);
    toast.h = setTimeout(function() { t.style.display = "none"; }, 1400);
  }

  // --- 도감 데이터 (12종, 모든 CO2는 "이산화 탄소"로 완벽 변환) ---
  var PH = [
    ["서식지 북상", "기온이 오르면 생물이 더 서늘한 북쪽이나 높은 산으로 옮겨 가요. 더 갈 곳이 없는 생물은 사라질 수 있어요."],
    ["생물 계절 엇박자", "꽃은 일찍 피는데 곤충이나 철새는 원래대로 움직여서 서로 만나지 못해요."],
    ["극지 얼음 감소", "북극 바다 얼음이 줄어들어 북극곰이 사냥할 곳을 잃어요."],
    ["산호 백화", "바닷물 온도가 오르면 산호 속 공생 조류가 빠져나가 산호가 하얗게 변하고 굶주려요."],
    ["해양 산성화", "이산화 탄소가 바닷물에 직접 녹아 바다가 산성으로 변하면 조개와 플랑크톤이 껍데기를 만들기 어려워요."],
    ["해수면 상승", "빙하가 녹고 바닷물이 팽창하면서 갯벌, 습지, 작은 섬이 물에 잠겨요."],
    ["극한 기상", "가뭄, 폭염, 폭우, 산불이 잦아져 숲과 생물이 큰 피해를 입어요."],
    ["해충·질병 확산", "겨울이 따뜻해져서 해충과 모기가 살아남아 더 넓게 퍼져요."],
    ["식물 성장 변화", "이산화 탄소가 많으면 식물이 더 크게 자라기도 하지만, 작물의 영양은 줄고 잡초가 유리해져요."],
    ["먹이그물 연쇄 반응", "작은 생물 하나가 줄면 그것을 먹는 생물들이 줄줄이 영향을 받아요."],
    ["되먹임(악순환)", "얼어 있던 땅(영구동토)이 녹으면 메탄이 나와 지구가 더 빨리 더워져요."],
    ["생물 다양성 감소", "여러 변화가 겹치면 많은 생물이 멸종 위기에 처해요."]
  ];

  var NAMES = {
    talk: "탐문", flash: "잠수 수색", lab: "실험실", chain: "원인 연결",
    timemap: "시간여행 지도", quiz: "추리", timing: "꽃가루 배달",
    objection: "이의 있음!", jump: "얼음 점프", diff: "틀린 그림",
    fire: "긴급 출동", swipe: "판정 스와이프", web: "먹이그물", accuse: "범인 지목"
  };

  // --- 사건 데이터 (8개 사건) ---
  var CASES = [
    {
      t: "하얗게 변한 제주 바다",
      scn: "sea",
      who: "흰동가리",
      sprite: "fish",
      ph: [3, 4],
      hint: "바닷물에 녹아 바다를 산성으로 만든다",
      st: [
        ["talk", [
          ["w", "알록달록하던 우리 집 산호가 하얗게 변했어요! 조개 친구들 껍데기도 얇아졌대요."],
          ["o", "바닷속은 어두워. 손가락으로 화면을 문질러 손전등을 비추고, 단서 3개를 찾아 터치해! 산소가 떨어지기 전에 말이야."]
        ]],
        ["flash", {
          time: 40,
          items: [
            [22, 35, "therm", "바다 수온계", "여름 바닷물 온도가 예전보다 크게 올랐어요."],
            [60, 68, "coral", "하얗게 변한 산호", "산호 속 공생 조류가 빠져나가 산호가 색과 영양을 잃었어요."],
            [86, 30, "shell", "얇아진 조개껍데기", "이산화 탄소가 바닷물에 녹아 바다가 산성으로 변했어요."]
          ]
        }],
        ["lab", {}],
        ["chain", {
          c: ["바다가 이산화 탄소와 열을 흡수", "수온 상승·바다 산성화", "공생 조류 탈출·껍데기 약화", "산호 백화"],
          d: "바닷물이 더 짜짐"
        }]
      ]
    },
    {
      t: "강원도로 이사 간 사과밭",
      scn: "farm",
      who: "사과 농부",
      sprite: "farmer",
      ph: [0],
      hint: "지구의 기온을 올린다",
      st: [
        ["talk", [
          ["w", "옛날엔 대구 사과가 유명했는데, 이젠 사과밭이 자꾸 북쪽으로 올라가요."],
          ["o", "기후 지도로 시간여행을 해 보자. 사과가 잘 자라는 곳이 어떻게 바뀌는지 잘 봐!"]
        ]],
        ["timemap", {}],
        ["quiz", {
          q: "사과밭처럼 다른 생물도 서늘한 곳을 찾아 이동해요. 한라산 꼭대기에 사는 구상나무는 어떻게 될까요?",
          o: ["더 북쪽 바다로 이사 간다", "더 올라갈 곳이 없어 사라질 위기에 처한다", "오히려 더 잘 자란다"],
          a: 1,
          ex: "구상나무는 이미 산꼭대기에 살아서 더 서늘한 곳으로 갈 수 없어요. 실제로 한라산 구상나무가 말라 죽고 있어요. 남쪽 바다의 아열대 물고기는 우리 바다로 올라오고 있고요."
        }]
      ]
    },
    {
      t: "꽃은 폈는데 벌이 없다",
      scn: "orchard",
      who: "벚꽃 요정",
      sprite: "fairy",
      ph: [1],
      hint: "봄을 앞당겨 생물의 시간표를 흔든다",
      st: [
        ["talk", [
          ["w", "저는 해마다 점점 일찍 피는데, 꿀벌이 오지 않아요. 열매를 맺을 수가 없어요!"],
          ["o", "꿀벌이 되어 꽃가루를 배달해 보자. 해가 갈수록 어떻게 달라지는지 느껴 봐!"]
        ]],
        ["timing", {}],
        ["objection", {
          q: "과수원 사람들의 증언이에요.",
          l: [
            ["농부", "요즘 벚꽃이 예전보다 일찍 펴요."],
            ["양봉가", "꿀벌은 꽃 피는 날짜에 딱 맞춰 깨어나니까 아무 문제 없어요."],
            ["새 박사", "철새가 도착하면 이미 먹이인 애벌레가 줄어 있어요."]
          ],
          a: 1,
          ex: "꿀벌이 깨어나는 시기는 꽃만큼 빨리 당겨지지 않아서 서로 어긋나요. 이것이 생물 계절 엇박자예요."
        }]
      ]
    },
    {
      t: "굶주린 북극곰",
      scn: "arctic",
      who: "북극곰",
      sprite: "bear",
      ph: [2, 10],
      hint: "얼음을 녹이고 악순환을 일으킨다",
      st: [
        ["talk", [
          ["w", "물범은 얼음 위에서 쉬어요. 그런데 얼음이 너무 빨리 녹아서 사냥을 못 해요!"],
          ["o", "얼음판을 터치해서 건너가며 물범을 4마리 사냥해 봐. 발밑 얼음이 녹으면 풍덩!"],
          ["o", "참, 북극의 얼어 있던 땅(영구동토)이 녹으면 메탄 가스가 나와서 지구를 더 덥게 만든대."]
        ]],
        ["jump", {}],
        ["chain", {
          loop: 1,
          c: ["이산화 탄소 증가로 기온 상승", "얼음과 영구동토가 녹음", "메탄 방출·햇빛 반사 감소", "더 빠른 온난화"],
          d: "물범이 많아짐"
        }]
      ]
    },
    {
      t: "잠기는 갯벌",
      scn: "mud",
      who: "도요새",
      sprite: "bird",
      ph: [5],
      hint: "바닷물 높이를 높인다",
      st: [
        ["talk", [
          ["w", "먼 길을 날다 쉬어 가는 갯벌이 점점 물에 잠기고 있어요!"],
          ["o", "1980년과 2050년 갯벌 그림이야. 오른쪽 그림에서 달라진 곳 4군데를 찾아 터치해!"]
        ]],
        ["diff", {}],
        ["quiz", {
          q: "갯벌을 삼킨 바닷물은 왜 높아졌을까요?",
          o: ["비가 많이 와서", "빙하가 녹은 물이 흘러들고, 따뜻해진 바닷물의 부피가 늘어서", "갯벌 진흙이 바다로 쓸려 가서"],
          a: 1,
          ex: "기온이 오르면 빙하가 녹고 바닷물이 팽창해서 해수면이 높아져요. 그래서 갯벌과 습지 생물이 살 곳을 잃어요."
        }]
      ]
    },
    {
      t: "불타고 병드는 숲",
      scn: "forest",
      who: "고라니",
      sprite: "deer",
      ph: [6, 7],
      hint: "가뭄과 따뜻한 겨울을 부른다",
      st: [
        ["talk", [
          ["w", "비가 안 오더니 큰 산불이 났어요! 겨울을 버틴 벌레들도 나무를 갉아먹어요."],
          ["o", "긴급 출동! 불과 해충을 터치해서 숲을 지켜. 불은 옆 나무로 번지니까 서둘러!"]
        ]],
        ["fire", {}],
        ["chain", {
          c: ["이산화 탄소 증가로 기후 변화", "가뭄과 따뜻한 겨울", "산불·해충 증가", "숲 생태계 피해"],
          d: "나무가 더 단단해짐"
        }]
      ]
    },
    {
      t: "커졌는데 맛이 없다?",
      scn: "rice",
      who: "농업 연구원",
      sprite: "scientist",
      ph: [8],
      hint: "식물이 광합성할 때 쓰는 재료다",
      st: [
        ["talk", [
          ["w", "이산화 탄소가 많아지니 벼가 쑥쑥 컸는데, 쌀의 영양은 줄었어요. 좋은 걸까요, 나쁜 걸까요?"],
          ["o", "카드를 보고 좋은 점과 걱정되는 점을 빠르게 판정해 보자!"]
        ]],
        ["swipe", {
          c: [
            ["벼가 더 크게 자란다", "g", "이산화 탄소는 광합성 재료라서 더 크게 자랄 수 있어요."],
            ["쌀 속 단백질과 철분이 줄어든다", "b", "영양이 줄어드는 건 걱정이에요."],
            ["광합성이 더 활발해진다", "g", "광합성 재료가 늘어나니까요."],
            ["잡초가 작물보다 더 무성해진다", "b", "잡초가 유리해지는 건 걱정이에요."],
            ["해충이 영양을 채우려고 잎을 더 많이 먹는다", "b", "영양이 적은 잎을 더 많이 갉아먹어요."],
            ["일부 식물은 물을 덜 쓰고도 자란다", "g", "잎의 숨구멍을 덜 열어도 되기 때문이에요."]
          ]
        }],
        ["objection", {
          q: "농업 연구 회의에서 나온 증언이에요.",
          l: [
            ["연구원 A", "이산화 탄소가 늘면 벼가 더 빨리 자랄 수 있어요."],
            ["연구원 B", "하지만 쌀의 영양소는 줄어들 수 있어요."],
            ["연구원 C", "이산화 탄소가 늘면 식물에게 좋은 일만 생기니 걱정할 필요가 없어요."],
            ["연구원 D", "잡초가 작물보다 더 잘 자랄 수도 있어요."]
          ],
          a: 2,
          ex: "이산화 탄소가 늘면 식물이 더 자라기도 하지만, 영양 감소와 잡초 증가 같은 문제도 함께 생겨요."
        }]
      ]
    },
    {
      t: "최종 사건: 연결된 범인",
      scn: "court",
      who: "펭귄",
      sprite: "penguin",
      ph: [9, 11],
      st: [
        ["talk", [
          ["w", "우리 먹이인 크릴이 줄었어요. 크릴을 먹는 친구들도 배고프대요!"],
          ["o", "크릴은 바다 얼음 아래에서 자라. 얼음이 줄고 바다가 산성화되면서 크릴이 줄었지. 누가 영향을 받는지 찾아보자."]
        ]],
        ["web", {}],
        ["accuse", {}]
      ]
    }
  ];

  var NEWS = [
    ["이산화 탄소가 바닷물에 녹으면 바다가 산성으로 변한다", 1, "맞아요! 이것이 해양 산성화예요."],
    ["이산화 탄소가 늘면 식물에게는 좋은 점만 있다", 0, "아니에요. 작물의 영양이 줄고 잡초가 유리해져요."],
    ["산호가 하얗게 변하는 것은 바닷물이 차가워져서다", 0, "아니에요. 수온이 올라서예요."],
    ["기온이 오르면 생물은 대체로 북쪽이나 높은 곳으로 옮겨 간다", 1, "맞아요! 서식지 북상이에요."],
    ["영구동토가 녹으면 메탄이 나와 온난화가 더 빨라진다", 1, "맞아요! 악순환이에요."],
    ["해수면 상승은 빙하가 녹은 물 때문만이다", 0, "바닷물이 따뜻해져 부피가 늘어나는 것도 원인이에요."],
    ["따뜻한 겨울은 해충이 살아남기 쉽게 만든다", 1, "맞아요!"],
    ["작은 크릴이 줄어도 고래에게는 영향이 없다", 0, "고래는 크릴을 먹고 살아요!"],
    ["꽃이 일찍 피면 꿀벌과 만나지 못할 수 있다", 1, "맞아요! 생물 계절 엇박자예요."]
  ];

  // 상태 관리
  var S;
  try { S = JSON.parse(localStorage.getItem("ecoDet3")); } catch (e) {}
  S = Object.assign({ name: "", done: [], stars: {}, bonus: 0, news: [] }, S || {});

  var cur = 0, C = null, si = 0, mist = 0, sticker = 0;
  function saveState() {
    try { localStorage.setItem("ecoDet3", JSON.stringify(S)); } catch (e) {}
  }
  function totalStars() {
    var sum = 0;
    for (var k in S.stars) { sum += S.stars[k]; }
    return sum + (S.bonus || 0);
  }

  function go(id) {
    document.querySelectorAll(".screen").forEach(function(s) { s.classList.remove("on"); });
    $(id).classList.add("on");

    // 화면 전환에 맞춘 BGM 재생
    if (id === 'sTitle') {
      Sound.bgm('title');
    } else if (id === 'sMap') {
      Sound.bgm('map');
    } else if (id === 'sDex') {
      Sound.bgm('map');
    } else if (id === 'sReport') {
      Sound.bgm('ending');
    }
  }

  function modal(iconHtml, title, text, btns) {
    Sound.sfx('open');
    $("mIcon").innerHTML = iconHtml || "";
    $("mTitle").innerHTML = title;
    $("mText").innerHTML = text;
    var b = $("mBtns");
    b.innerHTML = "";
    btns.forEach(function(item) {
      var btn = document.createElement("button");
      btn.className = "btn " + (item[2] || "");
      btn.textContent = item[0];
      btn.addEventListener("click", function() {
        Sound.sfx('click');
        $("modal").classList.remove("on");
        if (item[1]) item[1]();
      });
      b.appendChild(btn);
    });
    $("modal").classList.add("on");
  }

  var add = function(cls, html) {
    var d = document.createElement("div");
    d.className = cls;
    d.innerHTML = html;
    $("stage").appendChild(d);
    return d;
  };
  var hud = function(h) { return add("hudrow", h); };
  var paper = function(h) { return add("paper", h); };

  function box(k, cls) {
    var b = document.createElement("div");
    b.className = "box " + k + "-bg " + (cls || "");
    $("stage").appendChild(b);
    return b;
  }

  // --- 소리 토글 버튼 UI 갱신 ---
  function updateSoundBtn() {
    var muted = Sound.isMuted();
    var txt = muted ? "🔇 소리 꺼짐" : "🔊 소리 켜짐";
    if ($("soundBtn")) $("soundBtn").textContent = txt;
    if ($("soundBtnCase")) $("soundBtnCase").textContent = muted ? "🔇" : "🔊";
  }

  // 전역 클릭 액션 위임
  document.addEventListener("click", function(e) {
    var t = e.target.closest("[data-act]");
    if (!t) return;
    var act = t.dataset.act;

    if (act === 'start') begin();
    else if (act === 'reset') resetAll();
    else if (act === 'map') { Sound.sfx('back'); renderMap(); go("sMap"); }
    else if (act === 'dex') { Sound.sfx('click'); showDex(); }
    else if (act === 'draw') { Sound.sfx('click'); drawReport(); }
    else if (act === 'save') { Sound.sfx('click'); download(); }
    else if (act === 'exit') {
      Sound.sfx('click');
      modal(PixelArt.getImg('magnifier', 8), "수사를 멈출까요?", "지금 사건은 처음부터 다시 해야 해요.", [
        ["계속 수사", null, "blue"],
        ["지도로", function() { clearT(); renderMap(); go("sMap"); }, "gray"]
      ]);
    }
  });

  if ($("soundBtn")) {
    $("soundBtn").addEventListener("click", function() {
      Sound.toggleMute();
      updateSoundBtn();
    });
  }
  if ($("soundBtnCase")) {
    $("soundBtnCase").addEventListener("click", function() {
      Sound.toggleMute();
      updateSoundBtn();
    });
  }

  // 게임 시작 로직
  function resetAll() {
    Sound.sfx('click');
    if (confirm("저장된 진행 기록을 모두 지울까요?")) {
      S = { name: "", done: [], stars: {}, bonus: 0, news: [] };
      saveState();
      $("nameIn").value = "";
      toast("기록이 초기화되었습니다.");
    }
  }

  function begin() {
    Sound.unlock();
    var n = $("nameIn").value.trim();
    if (!n) {
      Sound.sfx('error');
      $("nameIn").classList.add("shake");
      setTimeout(function() { $("nameIn").classList.remove("shake"); }, 400);
      return;
    }
    Sound.sfx('select');
    S.name = n;
    saveState();
    renderMap();
    go("sMap");

    if (!S.done.length) {
      modal(
        '<img src="assets/img/char/owl.png" style="width:110px;height:110px;image-rendering:pixelated;">',
        "부엉 반장: 반가워, " + n + " 탐정!",
        "전국과 세계 곳곳에서 생물들이 사라지는 사건이 일어나고 있어.<br>사건마다 수사 방법이 달라! 사건을 풀 때마다 <b>범인의 단서</b>가 모이니까, 마지막에 진짜 범인을 밝혀내자!",
        [["좋아요!", null, "blue"]]
      );
    }
  }

  // 지도 렌더링
  function renderMap() {
    updateSoundBtn();
    $("hello").textContent = S.name + " 탐정";
    $("starTot").textContent = "★ " + totalStars() + " · 해결 " + S.done.length + "/8";
    var g = $("caseGrid");
    g.innerHTML = "";

    CASES.forEach(function(c, i) {
      var lock = (i === 7 && S.done.filter(function(x) { return x < 7; }).length < 7);
      var d = document.createElement("div");
      d.className = "case" + (lock ? " lock" : "");
      var s = S.stars[i] || 0;

      d.innerHTML =
        '<div class="thumb" style="background-image:url(\'assets/img/bg/' + c.scn + '.jpg\')"></div>' +
        '<div class="nm">' + (lock ? "🔒 " : "") + (i + 1) + ". " + c.t + '</div>' +
        '<div class="st">' + (s ? "★".repeat(s) + "☆".repeat(3 - s) : NAMES[c.st[1][0]]) + '</div>' +
        (S.done.includes(i) ? '<div class="stamp">해결!</div>' : '');

      d.addEventListener("click", function() {
        Sound.unlock();
        if (lock) {
          Sound.sfx('error');
          modal(PixelArt.getImg('magnifier', 8), "아직 잠겨 있어요", "앞의 사건 7개를 모두 해결하면 열려요!", [["확인"]]);
        } else {
          Sound.sfx('select');
          openCase(i);
        }
      });
      g.appendChild(d);
    });

    $("reportBtn").innerHTML = S.done.length >= 8 ? '<button class="btn big" id="goRep">🏆 최종 탐정 보고서 만들기</button>' : '';
    if ($("goRep")) {
      $("goRep").addEventListener("click", function() {
        Sound.sfx('select');
        openReport();
      });
    }
  }

  // --- 사건 및 스테이지 엔진 ---
  function openCase(i) {
    cur = i;
    C = CASES[i];
    si = 0;
    mist = 0;
    $("cTitle").textContent = "#" + (i + 1) + " " + C.t;
    go("sCase");

    // 케이스별 BGM 선택
    if (i === 0) Sound.bgm('underwater');
    else if (i === 5 || i === 3) Sound.bgm('action');
    else if (i === 7) Sound.bgm('final');
    else Sound.bgm('investigate');

    runStage();
  }

  function runStage() {
    clearT();
    $("stage").innerHTML = "";
    $("steps").innerHTML = C.st.map(function(s, idx) {
      return '<span class="step ' + (idx < si ? "ok" : idx === si ? "now" : "") + '">' + NAMES[s[0]] + '</span>';
    }).join("");

    var used = false;
    var st = C.st[si];
    var handler = T[st[0]];
    if (handler) {
      handler(st[1], function() {
        if (used) return;
        used = true;
        si++;
        if (si < C.st.length) {
          runStage();
        } else {
          solve();
        }
      });
    }
  }

  var T = {};

  // 1. 대화 (talk)
  T.talk = function(L, nx) {
    var b = box(C.scn);
    b.insertAdjacentHTML("beforeend",
      '<div class="banner">사건 #' + (cur + 1) + ' ' + C.t + '</div>' +
      '<div class="dlg"><div class="pf"></div><div style="flex:1"><div class="dname"></div><div class="dtx"></div></div></div>'
    );
    var d = b.querySelector(".dlg"), tx = d.querySelector(".dtx");
    var k = 0, full = false, ty;

    var show = function() {
      var item = L[k];
      var isOwl = (item[0] === 'o');
      var pfEl = d.querySelector(".pf");
      if (isOwl) {
        pfEl.innerHTML = '<img src="assets/img/char/owl.png" alt="부엉 반장">';
      } else {
        pfEl.innerHTML = '<img src="assets/img/char/' + C.sprite + '.png" alt="' + C.who + '">';
      }
      d.querySelector(".dname").textContent = isOwl ? "부엉 반장" : C.who;

      var text = item[1];
      var n = 0;
      full = false;
      clearInterval(ty);
      ty = every(function() {
        n++;
        tx.textContent = text.slice(0, n);
        if (n % 2 === 0) Sound.sfx('type');
        if (n >= text.length) {
          full = true;
          clearInterval(ty);
        }
      }, 30);
    };

    d.onclick = function() {
      Sound.unlock();
      if (!full) {
        clearInterval(ty);
        tx.textContent = L[k][1];
        full = true;
        return;
      }
      Sound.sfx('click');
      k++;
      if (k < L.length) show();
      else nx();
    };
    show();
  };

  // 2. 수중 손전등 탐색 (flash)
  T.flash = function(o, nx) {
    hud('<span class="pill">산소 <b id="oxy">' + o.time + '</b>초</span><span class="pill">단서 <b id="fc">0</b>/3</span>');
    var b = box("sea", "nt");
    var found = 0, t = o.time, pause = false, lx = 50, ly = 50;

    o.items.forEach(function(it) {
      var e = document.createElement("button");
      e.className = "obj";
      e.style.left = it[0] + "%";
      e.style.top = it[1] + "%";
      e.innerHTML = '<img src="assets/img/sprite/' + it[2] + '.png" alt="' + it[3] + '">';

      e.onclick = function() {
        Sound.unlock();
        if (e.classList.contains("got")) return;
        e.classList.add("got");
        found++;
        Sound.sfx('clue');
        $("fc").textContent = found;
        pause = true;
        modal('<img src="assets/img/sprite/' + it[2] + '.png" style="width:110px;height:110px;object-fit:contain;image-rendering:pixelated;">', "단서 발견! " + it[3], it[4], [
          ["수첩에 기록", function() {
            pause = false;
            if (found >= 3) {
              Sound.jingle('win');
              nx();
            }
          }, "blue"]
        ]);
      };
      b.appendChild(e);
    });

    var dk = document.createElement("div");
    dk.className = "dark";
    b.appendChild(dk);

    var paint = function() {
      dk.style.background = 'radial-gradient(circle at ' + lx + '% ' + ly + '%, transparent 0 90px, rgba(0,0,0,0.85) 160px, rgba(0,0,0,0.98) 280px)';
    };
    paint();

    var mv = function(e) {
      var r = b.getBoundingClientRect();
      lx = (e.clientX - r.left) / r.width * 100;
      ly = (e.clientY - r.top) / r.height * 100;
      paint();
    };
    b.addEventListener("pointermove", mv);
    b.addEventListener("pointerdown", mv, true);

    add("hint", "화면을 손가락으로 문지르면 손전등이 따라와요");

    every(function() {
      if (pause) return;
      t--;
      $("oxy").textContent = t;
      if (t <= 5 && t > 0) Sound.sfx('alarm');
      if (t <= 0) {
        mist++;
        pause = true;
        Sound.sfx('wrong');
        modal(PixelArt.getImg('magnifier', 8), "산소 부족!", "수면으로 올라가 산소를 채웠어요. 다시 잠수!", [
          ["다시 잠수", function() { t = o.time; pause = false; }, "blue"]
        ]);
      }
    }, 1000);
  };

  // 3. 실험실 (lab)
  T.lab = function(o, nx) {
    paper(
      '<h2>이산화 탄소 실험실</h2>' +
      '<p style="font-size:22px;margin:8px 0;">슬라이더를 밀어 바다에 녹는 이산화 탄소를 늘려 보세요. 산호와 조개에 무슨 일이 생길까요?</p>' +
      '<div class="row" style="gap:20px;align-items:stretch;margin-top:10px;">' +
      '  <div style="width:420px;max-width:100%" id="labv"></div>' +
      '  <div style="flex:1;min-width:240px;font-size:23px;line-height:1.8" id="labr"></div>' +
      '</div>' +
      '<input type="range" id="lab" min="280" max="800" value="280">' +
      '<div class="row"><button class="btn big" id="labok" disabled>관찰 완료</button></div>'
    );

    var up = function() {
      var v = +$("lab").value;
      var t = (v - 280) / 520;
      var cc = 'hsl(' + (12 - 12 * t) + ',' + (85 - 80 * t) + '%,' + (58 + 38 * t) + '%)';
      var wc = 'hsl(' + (195 - 20 * t) + ',70%,' + (45 - 10 * t) + '%)';

      $("labv").innerHTML =
        '<svg viewBox="0 0 420 260" style="border:4px solid #2d1806;border-radius:12px;">' +
        '  <rect width="420" height="260" rx="10" fill="' + wc + '"/>' +
        '  <path d="M140 240 q-30 -70 -10 -130 M140 240 q10 -90 40 -140 M140 240 q40 -60 70 -90" stroke="' + cc + '" stroke-width="24" stroke-linecap="round" fill="none"/>' +
        '  <path d="M260 230 Q320 130 380 230z" fill="#ffe0b2" stroke="#8d6e63" stroke-width="' + (14 - 12 * t) + '"/>' +
        (t < 0.5 ? '<circle cx="120" cy="150" r="7" fill="#8bc34a"/><circle cx="150" cy="130" r="7" fill="#8bc34a"/><circle cx="180" cy="160" r="7" fill="#8bc34a"/>' : '') +
        '</svg>';

      var msg = t < 0.3 ? "산호가 건강해요. 초록 점은 산호 속 공생 조류예요." :
                t < 0.6 ? "수온이 올라 조류가 산호를 떠나기 시작해요!" :
                "산호가 하얗게 변했어요(백화 현상). 바닷물이 산성으로 변해 조개껍데기도 얇아졌어요!";

      $("labr").innerHTML =
        '이산화 탄소: <b>' + v + 'ppm</b><br>' +
        '수온: <b>' + (20 + 3.5 * t).toFixed(1) + '℃</b><br>' +
        '바닷물 pH: <b>' + (8.2 - 0.4 * t).toFixed(2) + '</b> (낮을수록 산성)<br>' +
        '<span style="color:#c62828;font-weight:bold;">' + msg + '</span>';

      if (v >= 650) {
        if ($("labok").disabled) {
          $("labok").disabled = false;
          Sound.sfx('clue');
        }
      }
    };

    $("lab").oninput = function() {
      Sound.sfx('tick');
      up();
    };
    up();

    $("labok").onclick = function() {
      Sound.sfx('correct');
      nx();
    };
  };

  // 4. 시간여행 지도 (timemap)
  T.timemap = function(o, nx) {
    paper(
      '<h2>기후 지도 시간여행</h2>' +
      '<p style="font-size:22px;margin:8px 0;">시간 막대를 밀어서 사과가 잘 자라는 지역(빨간 띠)이 어떻게 움직이는지 관찰하세요.</p>' +
      '<div class="row" style="gap:24px;margin-top:12px;">' +
      '  <svg viewBox="0 0 300 480" style="width:230px;background:#bbdefb;border-radius:12px;border:4px solid #2e1c0c;" id="km"></svg>' +
      '  <div style="flex:1;min-width:240px;font-size:24px;line-height:1.8" id="kmr"></div>' +
      '</div>' +
      '<input type="range" id="yr" min="1970" max="2070" step="10" value="1970">' +
      '<div class="row"><button class="btn big" id="kmok" disabled>관찰 완료</button></div>'
    );

    var sh = "120,20 200,30 230,120 250,250 230,380 200,460 120,470 90,400 100,300 70,200 90,100";
    var up = function() {
      var y = +$("yr").value;
      var k = (y - 1970) / 100;
      var by = 360 - k * 250;

      $("km").innerHTML =
        '<defs><clipPath id="kc"><polygon points="' + sh + '"/></clipPath></defs>' +
        '<polygon points="' + sh + '" fill="#a5d6a7" stroke="#2e7d32" stroke-width="4"/>' +
        '<rect y="' + (by - 35) + '" width="300" height="70" fill="#e53935" opacity=".65" clip-path="url(#kc)"/>' +
        '<circle cx="190" cy="355" r="7" fill="#111"/><text x="200" y="352" font-size="22" font-family="Galmuri11">대구</text>' +
        '<circle cx="140" cy="110" r="7" fill="#111"/><text x="150" y="108" font-size="22" font-family="Galmuri11">철원</text>' +
        '<text x="16" y="44" font-size="34" font-family="Galmuri11" font-weight="bold" fill="#0d47a1">' + y + '년</text>';

      $("kmr").innerHTML =
        '연도: <b>' + y + '년</b><br>' +
        '사과 재배 중심지: <b>' + (k < 0.3 ? "대구·경북" : k < 0.6 ? "충북·경기" : "강원도") + '</b><br>' +
        (k > 0.7 ? '<span style="color:#c62828;font-weight:bold;">남쪽은 너무 더워져서 사과가 잘 자라지 않아요!</span>' : '');

      if (y >= 2070) {
        if ($("kmok").disabled) {
          $("kmok").disabled = false;
          Sound.sfx('clue');
        }
      }
    };

    $("yr").oninput = function() {
      Sound.sfx('tick');
      up();
    };
    up();

    $("kmok").onclick = function() {
      Sound.sfx('correct');
      nx();
    };
  };

  // 5. 퀴즈 (quiz)
  T.quiz = function(o, nx) {
    paper(
      '<h2>추리 타임</h2>' +
      '<p style="font-size:24px;margin:12px 0;line-height:1.5;">' + o.q + '</p>' +
      '<div id="qo"></div>' +
      '<p id="qh" style="color:#c62828;font-size:21px;min-height:30px;margin-top:6px;"></p>'
    );

    o.o.forEach(function(text, i) {
      var b = document.createElement("button");
      b.className = "btn blue qbtn";
      b.textContent = text;
      b.onclick = function() {
        Sound.unlock();
        if (i === o.a) {
          Sound.jingle('win');
          modal(PixelArt.getImg('medal', 10), "정답입니다!", o.ex, [["다음으로", nx, "blue"]]);
        } else {
          mist++;
          Sound.sfx('wrong');
          b.disabled = true;
          $("qh").textContent = "다시 한번 깊이 생각해 보세요!";
        }
      };
      $("qo").appendChild(b);
    });
  };

  // 6. 이의 있음! (objection)
  T.objection = function(o, nx) {
    paper(
      '<h2 style="color:#c62828">증언 심문</h2>' +
      '<p style="font-size:22px;margin:8px 0;">' + o.q + ' <b>거짓 증언</b>을 찾아 <span style="color:#c62828;font-weight:bold;">"이의 있음!"</span>을 누르세요.</p>' +
      '<div id="ob"></div>'
    );

    o.l.forEach(function(item, i) {
      var d = document.createElement("div");
      d.style.cssText = "display:flex;gap:12px;align-items:center;background:#fff;border-radius:12px;border:3px solid #2e1c0c;padding:12px 16px;margin:10px 0";
      d.innerHTML = '<div style="flex:1;font-size:22px"><b>' + item[0] + ':</b> "' + item[1] + '"</div>';

      var b = document.createElement("button");
      b.className = "btn red sm";
      b.textContent = "이의 있음!";

      b.onclick = function() {
        Sound.unlock();
        if (i === o.a) {
          Sound.sfx('objection');
          modal(
            '<div style="font-size:56px;color:#c62828;font-weight:bold;transform:rotate(-6deg);">이의 있음!</div>',
            "거짓 증언을 명쾌하게 밝혀냈어요!",
            o.ex,
            [["다음", nx, "blue"]]
          );
        } else {
          mist++;
          Sound.sfx('wrong');
          d.classList.add("shake");
          b.disabled = true;
          b.textContent = "사실이에요";
        }
      };
      d.appendChild(b);
      $("ob").appendChild(d);
    });
  };

  // 7. 원인 사슬 연결 (chain)
  T.chain = function(o, nx) {
    paper(
      '<h2>원인 사슬 연결</h2>' +
      '<p style="font-size:22px;margin:8px 0;">' +
      (o.loop ? '<b>악순환 고리</b>를 완성하세요! 마지막 칸은 다시 처음으로 이어져요.' : '카드를 <b>일어나는 순서대로</b> 터치하세요.') +
      ' 관계없는 카드가 하나 섞여 있어요!</p>' +
      '<div class="slots" id="sl"></div>' +
      '<div class="slots" id="ch"></div>' +
      '<p id="chh" style="color:#c62828;text-align:center;font-size:22px;min-height:30px;"></p>'
    );

    var k = 1;
    o.c.forEach(function(s, i) {
      if (i) $("sl").insertAdjacentHTML("beforeend", '<div class="arrow">➜</div>');
      $("sl").insertAdjacentHTML("beforeend", '<div class="slot ' + (i ? "" : "start") + '" id="s' + i + '">' + (i ? "?" : s) + '</div>');
    });
    if (o.loop) $("sl").insertAdjacentHTML("beforeend", '<div class="arrow">↩ 처음으로</div>');

    var chips = shuf(o.c.slice(1).concat([o.d]));
    chips.forEach(function(s) {
      var e = document.createElement("div");
      e.className = "chip";
      e.textContent = s;

      e.onclick = function() {
        Sound.unlock();
        if (s === o.c[k]) {
          Sound.sfx('pop');
          $("s" + k).textContent = s;
          $("s" + k).classList.add("fill");
          e.classList.add("used");
          k++;
          $("chh").textContent = "";
          if (k >= o.c.length) {
            Sound.jingle('win');
            after(nx, 800);
          }
        } else {
          mist++;
          Sound.sfx('wrong');
          e.classList.add("shake");
          after(function() { e.classList.remove("shake"); }, 400);
          $("chh").textContent = (s === o.d ? "이번 사건과 관계없는 카드예요!" : "순서가 달라요! 다시 확인해 보세요.");
        }
      };
      $("ch").appendChild(e);
    });
  };

  // 8. 꽃가루 배달 (timing)
  T.timing = function(o, nx) {
    var R = [
      [1980, 30, 60, 32, 62],
      [2000, 22, 52, 34, 64],
      [2020, 14, 44, 35, 65],
      [2050, 8, 38, 36, 66]
    ];
    hud('<span class="pill" id="tyr"></span><span class="pill">배달 성공 <b id="tok">0</b>/4</span>');
    paper(
      '<p style="font-size:22px;margin:8px 0;">검은 바가 <b style="color:#d81b60">꽃 피는 기간(분홍)</b>과 <b style="color:#f9a825">꿀벌 활동 기간(노랑)</b>이 <b>겹치는 곳</b>에 왔을 때 버튼을 누르세요!</p>' +
      '<div style="position:relative;height:120px;background:#e0e0e0;border:4px solid #2e1c0c;border-radius:12px;margin:16px 0;overflow:hidden">' +
      '  <div id="fl" style="position:absolute;top:0;height:50%;background:#f48fb1"></div>' +
      '  <div id="be" style="position:absolute;bottom:0;height:50%;background:#ffd54f"></div>' +
      '  <div id="cu" style="position:absolute;top:0;bottom:0;width:10px;background:#2e1c0c"></div>' +
      '</div>' +
      '<div class="row" style="justify-content:space-between;font-size:20px;font-weight:bold;"><span>3월 초</span><span>4월 중순</span><span>5월 말</span></div>' +
      '<div class="row"><button class="btn big" id="tb">🐝 꽃가루 배달!</button></div>' +
      '<p id="tm" style="text-align:center;font-size:22px;min-height:30px;margin-top:6px;"></p>'
    );

    var r = 0, ok = 0, pos = 0, dir = 1, miss = 0;
    var set = function() {
      var item = R[r];
      $("tyr").textContent = item[0] + "년 봄";
      $("fl").style.left = item[1] + "%";
      $("fl").style.width = (item[2] - item[1]) + "%";
      $("be").style.left = item[3] + "%";
      $("be").style.width = (item[4] - item[3]) + "%";
      miss = 0;
    };
    set();

    every(function() {
      pos += dir * (1.2 + r * 0.4);
      if (pos >= 99) { pos = 99; dir = -1; }
      if (pos <= 0) { pos = 0; dir = 1; }
      $("cu").style.left = pos + "%";
    }, 30);

    var next = function(m) {
      $("tm").textContent = m;
      r++;
      if (r >= R.length) {
        clearT();
        Sound.jingle('win');
        modal(
          '<img src="assets/img/char/' + C.sprite + '.png" style="width:110px;height:110px;object-fit:contain;image-rendering:pixelated;">',
          "배달 결과",
          "4번 중 " + ok + "번 성공했어요.<br>해가 갈수록 꽃이 일찍 피어서 꿀벌과 만나는 기간이 줄어들었죠?<br>이것이 <b>생물 계절 엇박자</b>예요.",
          [["다음", nx, "blue"]]
        );
      } else {
        set();
      }
    };

    $("tb").onclick = function() {
      Sound.unlock();
      var item = R[r];
      if (pos >= Math.max(item[1], item[3]) && pos <= Math.min(item[2], item[4])) {
        ok++;
        Sound.sfx('correct');
        $("tok").textContent = ok;
        next("성공! 다음 해로...");
      } else {
        miss++;
        Sound.sfx('wrong');
        $("tm").textContent = "꽃과 벌이 만나지 못했어요! (" + miss + "/3)";
        if (miss >= 3) {
          mist++;
          next("이번 해는 열매를 맺지 못했어요...");
        }
      }
    };
  };

  // 9. 얼음 점프 (jump)
  T.jump = function(o, nx) {
    hud('<span class="pill">남은 시간 <b id="jt">35</b>초</span><span class="pill">사냥 <b id="js">0</b>/4</span><span class="pill" id="jy">2000년</span>');
    var b = box("arctic", "nt");
    var lay = document.createElement("div");
    lay.style.cssText = "position:absolute;inset:0";
    b.appendChild(lay);

    var mk = function(s) {
      return { x: 12 + Math.random() * 76, y: 52 + Math.random() * 36, s: s || 100 + Math.random() * 40 };
    };
    var F = [mk(), mk(), mk(), mk(), mk(), mk()];
    var bear = 0, seal = -1, sc = 0, t = 35, yr = 2000, over = false;

    var draw = function() {
      lay.innerHTML = F.map(function(f, i) {
        return '<div data-i="' + i + '" style="position:absolute;left:' + f.x + '%;top:' + f.y + '%;width:' + (f.s * 1.5) + 'px;height:' + (f.s * 0.7) + 'px;transform:translate(-50%,-50%);background:#ffffff;border-radius:40%;border:4px solid #b3e5fc;box-shadow:0 8px 0 #0288d1;cursor:pointer;">' +
          (i === bear ? '<div style="position:absolute;left:50%;bottom:20%;transform:translateX(-50%);width:70px;height:70px;pointer-events:none"><img src="assets/img/char/bear.png" style="width:100%;height:100%;object-fit:contain;image-rendering:pixelated;"></div>' :
           i === seal ? '<div style="position:absolute;left:50%;bottom:10%;transform:translateX(-50%);width:60px;height:60px;pointer-events:none"><img src="assets/img/char/seal.png" style="width:100%;height:100%;object-fit:contain;image-rendering:pixelated;"></div>' : '') +
          '</div>';
      }).join("");
    };

    var end = function(w) {
      if (over) return;
      over = true;
      clearT();
      if (!w) mist++;
      Sound.jingle(w ? 'win' : 'lose');
      modal(
        '<img src="assets/img/char/bear.png" style="width:110px;height:110px;object-fit:contain;image-rendering:pixelated;">',
        w ? "사냥 성공!" : "시간 초과!",
        "물범 " + sc + "마리를 잡았어요.<br>해가 지날수록 얼음판이 빨리 녹고 작아져서 건너기 어려웠죠?<br>실제 북극곰도 사냥터를 잃고 굶주리고 있어요.",
        [["다음", nx, "blue"]]
      );
    };

    lay.addEventListener("pointerdown", function(e) {
      Sound.unlock();
      var d = e.target.closest("[data-i]");
      if (!d || over) return;
      var i = +d.dataset.i;
      if (i === bear) return;
      bear = i;
      Sound.sfx('jump');

      if (i === seal) {
        sc++;
        Sound.sfx('coin');
        $("js").textContent = sc;
        seal = -1;
        toast("물범 사냥 성공!");
        if (sc >= 4) end(true);
      }
      draw();
    });

    every(function() {
      var melt = 0.6 + (yr - 2000) / 40;
      F.forEach(function(f, i) {
        f.s -= melt * (0.5 + Math.random());
        if (f.s < 45) {
          if (i === bear) {
            mist++;
            Sound.sfx('splash');
            var m = -1;
            F.forEach(function(g, j) {
              if (j !== i && (m < 0 || g.s > F[m].s)) m = j;
            });
            bear = m;
            toast("풍덩! 발밑 얼음이 녹았어요");
          }
          if (i === seal) seal = -1;
          F[i] = mk(Math.max(60, 130 - (yr - 2000)));
        }
      });

      if (seal < 0 && Math.random() < 0.12) {
        var c = F.map(function(_, j) { return j; }).filter(function(j) { return j !== bear; });
        seal = c[Math.floor(Math.random() * c.length)];
      }
      draw();
    }, 250);

    every(function() {
      t--;
      yr += 2;
      $("jt").textContent = t;
      $("jy").textContent = yr + "년";
      if (t <= 5 && t > 0) Sound.sfx('alarm');
      if (t <= 0) end(false);
    }, 1000);

    draw();
    add("hint", "다른 얼음판을 터치하면 북극곰이 점프해요. 물범이 있는 얼음판으로 이동하세요!");
  };

  // 10. 틀린 그림 찾기 (diff) - 1980년 vs 2050년 갯벌
  T.diff = function(o, nx) {
    hud('<span class="pill">찾은 차이 <b id="dc">0</b>/4</span>');
    var w = add("row", "");
    w.style.cssText = "gap:12px;width:100%;flex-wrap:nowrap;";

    var mkb = function(label, isTarget) {
      var b = document.createElement("div");
      b.className = "box";
      b.style.width = "49%";
      b.style.aspectRatio = "16/10";
      b.style.position = "relative";
      b.style.backgroundImage = "url('assets/img/bg/" + (isTarget ? "mud_2050.png" : "mud_1980.png") + "')";
      b.style.backgroundSize = "cover";
      b.style.backgroundPosition = "center";
      b.style.backgroundRepeat = "no-repeat";
      b.innerHTML = '<div class="pill" style="position:absolute;left:10px;top:10px;z-index:5;">' + label + '</div>';
      w.appendChild(b);
      return b;
    };

    var b1 = mkb("1980년", false);
    var b2 = mkb("2050년 (여기서 찾기)", true);

    var D = [
      [55, 70, "갯벌이 바닷물에 잠겨 게들이 살 곳을 잃었어요!"],
      [28, 18, "쉬어 가던 철새가 크게 줄어들었어요!"],
      [10, 58, "갈대 습지가 바닷물에 잠겨 사라졌어요!"],
      [88, 40, "해수면 수위 눈금이 위험 수준으로 높아졌어요!"]
    ];
    var f = 0, cool = 0;

    b2.addEventListener("pointerdown", function(e) {
      Sound.unlock();
      var r = b2.getBoundingClientRect();
      var x = (e.clientX - r.left) / r.width * 100;
      var y = (e.clientY - r.top) / r.height * 100;

      var k = D.findIndex(function(d) {
        return !d.f && Math.hypot(x - d[0], (y - d[1]) / 2) < 14;
      });

      if (k < 0) {
        if (Date.now() > cool) {
          mist++;
          Sound.sfx('wrong');
          cool = Date.now() + 1200;
          toast("거기는 변화가 없는 곳이에요!");
        }
        return;
      }

      D[k].f = 1;
      f++;
      Sound.sfx('correct');
      $("dc").textContent = f;
      toast(D[k][2]);

      b2.insertAdjacentHTML("beforeend",
        '<div style="position:absolute;left:' + D[k][0] + '%;top:' + D[k][1] + '%;width:20%;aspect-ratio:1;transform:translate(-50%,-50%);border:6px solid #e53935;border-radius:50%;pointer-events:none;box-shadow:0 0 16px #ff1744;z-index:10;animation:pop .25s;"></div>'
      );

      if (f >= 4) {
        Sound.jingle('win');
        after(function() {
          modal(
            PixelArt.getImg('medal', 10),
            "틀린 그림을 모두 찾았습니다!",
            "지구 기온 상승으로 빙하가 녹고 바닷물이 팽창하면서 해수면이 높아졌어요.<br>갯벌과 갈대 습지가 물에 잠기고, 게와 철새들이 살아갈 터전을 잃게 되었답니다.",
            [["다음", nx, "blue"]]
          );
        }, 800);
      }
    });

    add("hint", "오른쪽(2050년) 그림에서 바닷물 상승으로 달라진 곳 4군데를 터치하세요!");
  };

  // 11. 긴급 출동 산불 진화 (fire)
  T.fire = function(o, nx) {
    hud('<span class="pill">남은 시간 <b id="ft">30</b>초</span><span class="pill" id="fy">2000년</span><span class="pill">건조도 <b id="fd">20</b>%</span><span class="pill" style="background:#c62828">피해 나무 <b id="fb">0</b></span>');
    var b = box("forest", "nt");
    var lay = document.createElement("div");
    lay.style.cssText = "position:absolute;inset:0";
    b.appendChild(lay);

    var G = [];
    for (var r = 0; r < 2; r++) {
      for (var c = 0; c < 6; c++) {
        G.push({ x: 10 + c * 16, y: 52 + r * 30, s: 0, t: 0 });
      }
    }

    // 레트로 픽셀 소나무 & 불탄 나무 그래픽
    var PIXEL_TREE =
      '<img src="assets/img/sprite/tree.png" style="width:100%;height:100%;object-fit:contain;filter:drop-shadow(0 6px 8px rgba(0,0,0,0.5));pointer-events:none;">';

    var PIXEL_DEAD =
      '<img src="assets/img/sprite/tree_dead.png" style="width:100%;height:100%;object-fit:contain;filter:drop-shadow(0 4px 6px rgba(0,0,0,0.6));pointer-events:none;">';

    var paint = function(g) {
      var icon = "";
      if (g.s === 3) {
        icon = PIXEL_DEAD;
      } else {
        icon = PIXEL_TREE;
      }

      // 커진 불꽃 (나무 전체를 감싸는 크기)
      if (g.s === 1) {
        icon +=
          '<div style="position:absolute;inset:-20% -15% -5%;display:flex;align-items:center;justify-content:center;pointer-events:none;animation:pulseGlow .4s infinite;">' +
          '  <img src="assets/img/sprite/fire.png" style="width:100%;height:100%;object-fit:contain;filter:drop-shadow(0 0 16px #ff3d00);image-rendering:pixelated;">' +
          '</div>';
      }
      // 커진 해충/애벌레 (나무 잎 사이에 큼직하게 붙음)
      else if (g.s === 2) {
        icon +=
          '<div style="position:absolute;inset:15% -10% auto auto;width:68%;height:68%;display:flex;align-items:center;justify-content:center;pointer-events:none;animation:shakeX .6s infinite;">' +
          '  <img src="assets/img/sprite/bug.png" style="width:100%;height:100%;object-fit:contain;filter:drop-shadow(0 0 10px #76ff03);image-rendering:pixelated;">' +
          '</div>';
      }
      g.el.innerHTML = icon;
    };

    // 터치하기 편하도록 나무 크기를 대폭 확대 (폭 15% -> 17%, 높이비율 증대)
    G.forEach(function(g, i) {
      var d = document.createElement("div");
      d.dataset.i = i;
      d.style.cssText = 'position:absolute;left:' + g.x + '%;top:' + g.y + '%;width:16%;height:42%;transform:translate(-50%,-50%);cursor:pointer;display:flex;align-items:center;justify-content:center;z-index:3;';
      g.el = d;
      lay.appendChild(d);
      paint(g);
    });

    var t = 30, yr = 2000, dry = 20, dead = 0, over = false;

    lay.addEventListener("pointerdown", function(e) {
      Sound.unlock();
      var d = e.target.closest("[data-i]");
      if (!d) return;
      var g = G[d.dataset.i];
      if (g.s === 1) {
        g.s = 0;
        Sound.sfx('extinguish');
        paint(g);
      } else if (g.s === 2) {
        g.s = 0;
        Sound.sfx('hit');
        paint(g);
      }
    });

    var kill = function(g) {
      g.s = 3;
      dead++;
      $("fb").textContent = dead;
      paint(g);
    };

    every(function() {
      var now = Date.now();
      G.forEach(function(g, i) {
        if (g.s === 1 && now - g.t > 3000) {
          kill(g);
          [i - 1, i + 1, i - 6, i + 6].forEach(function(j) {
            var n = G[j];
            if (n && n.s === 0 && Math.abs(n.x - g.x) < 20) {
              n.s = 1;
              n.t = now;
              Sound.sfx('fire');
              paint(n);
            }
          });
        } else if (g.s === 2 && now - g.t > 4000) {
          kill(g);
        }
      });

      if (Math.random() < dry / 250) {
        var c = G.filter(function(g) { return g.s === 0; });
        if (c.length) {
          var target = c[Math.floor(Math.random() * c.length)];
          target.s = (Math.random() < 0.6 ? 1 : 2);
          target.t = now;
          if (target.s === 1) Sound.sfx('fire');
          else Sound.sfx('buzz');
          paint(target);
        }
      }
    }, 200);

    every(function() {
      t--;
      yr += 3;
      dry = Math.min(95, dry + 2.5);
      $("ft").textContent = t;
      $("fy").textContent = yr + "년";
      $("fd").textContent = Math.round(dry);

      if (!over && (t <= 0 || G.every(function(g) { return g.s === 3; }))) {
        over = true;
        clearT();
        mist += Math.floor(dead / 3);
        Sound.jingle('win');
        modal(
          '<img src="assets/img/sprite/fire.png" style="width:110px;height:110px;object-fit:contain;image-rendering:pixelated;">',
          "출동 종료!",
          "피해 나무: " + dead + "그루.<br>시간이 지날수록 가뭄으로 숲이 건조해져 불이 자주 났고, 따뜻한 겨울을 견딘 해충까지 늘어났죠?",
          [["다음", nx, "blue"]]
        );
      }
    }, 1000);

    add("hint", "불과 애벌레를 터치하세요! 불은 3초 뒤 옆 나무로 번져요.");
  };

  // 12. 판정 스와이프 (swipe)
  T.swipe = function(o, nx) {
    hud('<span class="pill">콤보 <b id="cb">0</b></span><span class="pill"><b id="sn">1</b>/' + o.c.length + '</span>');
    paper(
      '<p style="font-size:22px;text-align:center;">이산화 탄소가 많아졌을 때 식물에게 생기는 일이에요.<br><b>좋은 점</b>이면 오른쪽, <b>걱정되는 점</b>이면 왼쪽으로 밀거나 버튼을 누르세요!</p>' +
      '<div style="height:16px;background:#ddd;border:3px solid #2e1c0c;border-radius:8px;margin:12px 0;overflow:hidden">' +
      '  <div id="sbar" style="height:100%;background:#ff7043;width:100%"></div>' +
      '</div>' +
      '<div id="card" style="margin:12px auto;width:min(540px,100%);min-height:180px;background:#fff;border:5px solid var(--c-wood-dark);border-radius:18px;display:flex;align-items:center;justify-content:center;text-align:center;font-size:28px;font-weight:bold;padding:24px;transition:transform .25s,opacity .25s;touch-action:none;box-shadow:0 8px 20px rgba(0,0,0,0.15)"></div>' +
      '<div class="row" style="gap:16px;"><button class="btn red" id="swl">👈 걱정되는 점</button><button class="btn blue" id="swr">좋은 점 👉</button></div>'
    );

    var i = 0, cb = 0, tl = 7000, x0 = null, lock = false;
    var cd = $("card");

    var show = function() {
      cd.style.transform = "";
      cd.style.opacity = 1;
      cd.textContent = o.c[i][0];
      $("sn").textContent = i + 1;
      tl = 7000;
      lock = false;
    };

    var ans = function(s) {
      if (lock || i >= o.c.length) return;
      lock = true;
      var ok = (s === o.c[i][1]);
      cd.style.transform = s ? ('translateX(' + (s === "g" ? 320 : -320) + 'px) rotate(' + (s === "g" ? 15 : -15) + 'deg)') : "scale(.8)";
      cd.style.opacity = 0;

      if (ok) {
        cb++;
        Sound.sfx('correct');
        if (cb >= 3) Sound.sfx('combo');
        toast(cb >= 3 ? cb + " 콤보!" : "정답!");
      } else {
        mist++;
        cb = 0;
        Sound.sfx('wrong');
        toast((s ? "땡! " : "시간 초과! ") + o.c[i][2]);
      }
      $("cb").textContent = cb;
      i++;

      if (i >= o.c.length) {
        clearT();
        Sound.jingle('win');
        after(function() {
          modal(
            PixelArt.getImg('medal', 10),
            "판정 완료!",
            "이산화 탄소가 늘면 식물이 더 크게 자라기도 하지만, <b>작물의 영양은 줄고 잡초가 유리</b>해져요. 좋은 점만 있는 건 아니랍니다!",
            [["다음", nx, "blue"]]
          );
        }, 1200);
      } else {
        after(show, 1100);
      }
    };

    $("swl").onclick = function() { Sound.unlock(); ans("b"); };
    $("swr").onclick = function() { Sound.unlock(); ans("g"); };

    cd.onpointerdown = function(e) { Sound.unlock(); x0 = e.clientX; };
    cd.onpointerup = function(e) {
      if (x0 !== null) {
        var dx = e.clientX - x0;
        if (Math.abs(dx) > 60) {
          Sound.sfx('whoosh');
          ans(dx > 0 ? "g" : "b");
        }
      }
      x0 = null;
    };

    every(function() {
      if (lock) return;
      tl -= 100;
      $("sbar").style.width = Math.max(0, tl / 70) + "%";
      if (tl <= 0) ans(null);
    }, 100);

    show();
  };

  // 13. 먹이그물 연쇄 반응 (web)
  T.web = function(o, nx) {
    hud('<span class="pill">배고파진 생물 <b id="wc">0</b>/4</span>');
    var b = box("ant");
    b.insertAdjacentHTML("beforeend", '<svg id="wl" viewBox="0 0 1000 500" preserveAspectRatio="none" style="position:absolute;inset:0;width:100%;height:100%;pointer-events:none"></svg>');

    var N = [
      ["크릴", 50, 80, 0],
      ["펭귄", 18, 38, 1],
      ["고래", 82, 38, 1],
      ["물범", 35, 16, 1],
      ["오징어", 65, 16, 1],
      ["북극곰", 10, 78, 0, "북극곰은 북극에 살아서 남극 크릴과는 관계없어요!"],
      ["선인장", 90, 78, 0, "선인장은 사막 식물이에요!"]
    ];
    var f = 0;

    N.forEach(function(n) {
      var d = document.createElement("button");
      d.style.cssText = 'position:absolute;left:' + n[1] + '%;top:' + n[2] + '%;transform:translate(-50%,-50%);width:120px;height:120px;border-radius:50%;border:5px solid #2e1c0c;background:' + (n[0] === "크릴" ? "#ff8a80" : "#ffffffdd") + ';font-size:24px;font-weight:bold;color:#0d47a1;z-index:2;cursor:pointer;box-shadow:0 6px 14px rgba(0,0,0,0.4);';
      d.textContent = n[0];

      d.onclick = function() {
        Sound.unlock();
        if (n[0] === "크릴" || d.disabled) return;
        d.disabled = true;

        if (n[3]) {
          f++;
          Sound.sfx('correct');
          $("wc").textContent = f;
          d.style.background = "#ffcc80";
          d.textContent = n[0] + " 배고파!";
          d.style.fontSize = "19px";
          $("wl").insertAdjacentHTML("beforeend", '<line x1="500" y1="400" x2="' + (n[1] * 10) + '" y2="' + (n[2] * 5) + '" stroke="#ffeb3b" stroke-width="8"/>');

          if (f >= 4) {
            Sound.jingle('win');
            after(function() {
              modal(
                PixelArt.getImg('medal', 10),
                "먹이그물 연쇄 반응!",
                "크릴 하나가 줄었을 뿐인데 펭귄, 고래, 물범, 오징어가 모두 배고파졌어요.<br>이렇게 여러 변화가 겹치면 <b>생물 다양성</b>이 줄어들어요.",
                [["다음", nx, "blue"]]
              );
            }, 800);
          }
        } else {
          mist++;
          Sound.sfx('wrong');
          d.style.opacity = 0.45;
          toast(n[4]);
        }
      };
      b.appendChild(d);
    });

    add("hint", "크릴이 줄었어요! 먹이가 부족해질 생물을 모두 터치하세요.");
  };

  // 14. 최종 범인 지목 (accuse)
  T.accuse = function(o, nx) {
    var hs = CASES.slice(0, 7).filter(function(c, i) { return S.done.includes(i); }).map(function(c) { return c.hint; });
    paper(
      '<h2>최종 범인 지목!</h2>' +
      '<p style="font-size:22px;margin:8px 0;">수사 수첩의 단서를 보고 모든 사건의 진짜 범인을 지목하세요.</p>' +
      '<div style="background:#efe3c8;border:3px solid #2e1c0c;border-radius:12px;padding:14px 20px;font-size:22px;line-height:1.7;margin:12px 0">' +
      '  <b>🔍 수집한 범인의 특징</b><br>' +
      hs.map(function(h) { return "• " + h; }).join("<br>") +
      '</div>' +
      '<div class="row" id="sus" style="gap:12px;"></div>' +
      '<p id="ah" style="color:#c62828;font-size:22px;text-align:center;min-height:56px;margin-top:8px;"></p>'
    );

    var suspects = [
      ["태양", "태양 활동은 최근 수십 년간 거의 변하지 않았어요. 게다가 태양은 바다를 산성으로 만들지 못해요!"],
      ["오존층 구멍", "오존층 구멍은 자외선 문제예요. 광합성 재료도 아니고 바다를 산성화하지도 않아요!"],
      ["화산", "화산이 내뿜는 이산화 탄소는 사람이 내뿜는 양의 1%쯤밖에 안 돼요!"],
      ["늘어난 이산화 탄소", ""]
    ];

    suspects.forEach(function(item, i) {
      var b = document.createElement("button");
      b.className = "btn " + (i % 2 ? "blue" : "");
      b.textContent = item[0];

      b.onclick = function() {
        Sound.unlock();
        if (i === 3) {
          Sound.jingle('solve');
          modal(
            PixelArt.getImg('magnifier', 10),
            "범인은 바로 늘어난 이산화 탄소!",
            "지구 기온을 올리고, 바다에 녹아 산성으로 만들고, 식물 광합성의 재료가 되는 것!<br>모든 단서가 <b>늘어난 이산화 탄소</b>를 가리키고 있었습니다!",
            [["사건 종결", nx, "blue"]]
          );
        } else {
          mist++;
          Sound.sfx('wrong');
          b.disabled = true;
          $("ah").textContent = item[1];
        }
      };
      $("sus").appendChild(b);
    });
  };

  // --- 사건 해결 & 속보 퀴즈 ---
  function solve() {
    clearT();
    var st = (mist <= 1 ? 3 : mist <= 3 ? 2 : 1);
    S.stars[cur] = Math.max(S.stars[cur] || 0, st);
    if (!S.done.includes(cur)) S.done.push(cur);
    saveState();

    Sound.sfx('stamp');
    Sound.jingle('win');

    var fin = function() {
      if (S.done.length >= 8) {
        after(function() {
          modal(
            PixelArt.getImg('medal', 12),
            "축하합니다! 모든 사건 해결!",
            "전 세계 생태계를 위협하던 사건을 모두 해결했습니다.<br>이제 나만의 탐정 보고서를 작성해 볼까요?",
            [["보고서 작성하기", openReport, "blue"]]
          );
        }, 400);
      }
    };

    modal(
      PixelArt.getImg('medal', 10),
      "사건 해결! <span style='color:#ff8f00'>" + "★".repeat(st) + "☆".repeat(3 - st) + "</span>",
      (C.hint ? "수사 보드에 범인 단서 추가:<br><b>" + C.hint + "</b><br><br>" : "") +
      "도감 등록 완료!<br>" +
      C.ph.map(function(p) { return "<b>" + PH[p][0] + "</b>: " + PH[p][1]; }).join("<br>"),
      [["지도로", function() {
        renderMap();
        go("sMap");
        var n = S.done.length;
        if ([2, 4, 6].includes(n) && !S.news.includes(n)) {
          S.news.push(n);
          saveState();
          after(function() {
            modal(
              '<div class="banner" style="position:static">긴급 속보</div>',
              "기후 뉴스 속보 퀴즈!",
              "8초 안에 O, X로 답하세요!<br>3문제를 모두 맞히면 보너스 별을 획득합니다!",
              [["시작", function() { news(fin); }, "blue"]]
            );
          }, 400);
        } else {
          fin();
        }
      }, "blue"]]
    );
  }

  function news(cb) {
    var set = shuf(NEWS.slice()).slice(0, 3);
    var k = 0, sc = 0;

    var ask = function() {
      if (k >= 3) {
        if (sc === 3) S.bonus = (S.bonus || 0) + 1;
        saveState();
        renderMap();
        Sound.jingle(sc === 3 ? 'win' : 'star');
        return modal(
          PixelArt.getImg('medal', 10),
          "속보 퀴즈 종료",
          sc + "/3 문제 정답!" + (sc === 3 ? "<br>★ 보너스 별 1개 획득!" : ""),
          [["확인", cb, "blue"]]
        );
      }

      var q = set[k];
      var t = 8, dn = false;
      var h = setInterval(function() {
        t--;
        var e = $("nt");
        if (e) e.textContent = t;
        if (t <= 3 && t > 0) Sound.sfx('alarm');
        if (t <= 0) fin(null);
      }, 1000);

      var fin = function(a) {
        if (dn) return;
        dn = true;
        clearInterval(h);
        var ok = (a === q[1]);
        if (ok) {
          sc++;
          Sound.sfx('correct');
        } else {
          Sound.sfx('wrong');
        }
        k++;
        modal(
          ok ? PixelArt.getImg('medal', 8) : PixelArt.getImg('magnifier', 8),
          ok ? "정답!" : a == null ? "시간 초과!" : "오답!",
          q[2],
          [["다음", ask, "blue"]]
        );
      };

      modal(
        '<div class="banner" style="position:static">속보 ' + (k + 1) + '/3</div>',
        q[0],
        '남은 시간 <b id="nt">8</b>초',
        [["O", function() { fin(1); }, "blue"], ["X", function() { fin(0); }, "red"]]
      );
    };
    ask();
  }

  // --- 도감 뷰 ---
  function showDex() {
    var got = new Set(S.done.flatMap(function(i) { return CASES[i].ph; }));
    $("dex").innerHTML = PH.map(function(p, i) {
      return got.has(i) ?
        '<div class="ph"><b>' + (i + 1) + '. ' + p[0] + '</b>' + p[1] + '</div>' :
        '<div class="ph lock"><b>' + (i + 1) + '. ???</b>사건을 해결하면 열려요</div>';
    }).join("");
    go("sDex");
  }

  // --- 최종 보고서 캔버스 생성 및 다운로드 ---
  var rank = function() {
    var s = totalStars();
    return s >= 24 ? "특급 명탐정" : s >= 17 ? "수석 탐정" : "견습 탐정";
  };

  function openReport() {
    var st = $("stickers");
    st.innerHTML = "";

    var stickerSprites = CASES.map(function(c) { return c.sprite; }).concat(['owl', 'medal']);
    stickerSprites.forEach(function(spr, i) {
      var e = document.createElement("div");
      e.className = "stk" + (i === sticker ? " sel" : "");
      if (spr === 'medal') {
        e.innerHTML = PixelArt.getImg('medal', 7);
      } else {
        e.innerHTML = '<img src="assets/img/char/' + spr + '.png" alt="' + spr + '">';
      }
      e.addEventListener("click", function() {
        Sound.sfx('select');
        sticker = i;
        document.querySelectorAll(".stk").forEach(function(x) { x.classList.remove("sel"); });
        e.classList.add("sel");
        drawReport();
      });
      st.appendChild(e);
    });

    go("sReport");
    drawReport();
  }

  function wrap(x, t, X, Y, w, lh) {
    var l = "";
    for (var i = 0; i < t.length; i++) {
      var ch = t[i];
      if (x.measureText(l + ch).width > w) {
        x.fillText(l, X, Y);
        Y += lh;
        l = ch;
      } else {
        l += ch;
      }
    }
    x.fillText(l, X, Y);
  }

  function drawReport(cb) {
    var cv = $("cv"), x = cv.getContext("2d"), W = 1200, H = 1700, F = '"Galmuri11", monospace';

    // 배경
    x.fillStyle = "#fff8e7";
    x.fillRect(0, 0, W, H);
    x.strokeStyle = "#f0e2c0";
    x.lineWidth = 2;
    for (var y = 60; y < H; y += 40) {
      x.beginPath(); x.moveTo(0, y); x.lineTo(W, y); x.stroke();
    }
    x.fillStyle = "#8d5524";
    x.fillRect(0, 0, 44, H);
    x.strokeStyle = "#5d3a14";
    x.lineWidth = 12;
    x.strokeRect(60, 20, W - 80, H - 40);

    // 헤더 타이틀
    x.textAlign = "center";
    x.fillStyle = "#5d3a14";
    x.font = "bold 44px " + F;
    x.fillText("생태계 탐정단 · 기후 해결 보고서", W / 2 + 20, 90);

    // 탐정 이름 및 계급
    x.font = "bold 52px " + F;
    x.fillStyle = "#2b2118";
    x.fillText(S.name + " " + rank(), W / 2 + 20, 340);

    x.font = "28px " + F;
    x.fillStyle = "#ff8f00";
    x.fillText("★ " + totalStars() + "개 · 해결한 사건 " + S.done.length + "/8 · " + new Date().toLocaleDateString("ko-KR"), W / 2 + 20, 385);

    // 범인 도장 띠
    x.save();
    x.translate(W / 2 + 20, 445);
    x.rotate(-0.02);
    x.fillStyle = "#c62828";
    x.fillRect(-370, -36, 740, 72);
    x.fillStyle = "#fff";
    x.font = "bold 34px " + F;
    x.fillText("범인: 늘어난 이산화 탄소", 0, 10);
    x.restore();

    // 생태계 변화 체크리스트 (전체 12항목 완벽 표시)
    x.textAlign = "left";
    x.fillStyle = "#5d3a14";
    x.font = "bold 34px " + F;
    x.fillText("내가 밝혀낸 생태계 변화", 110, 540);

    var got = new Set(S.done.flatMap(function(i) { return CASES[i].ph; }));
    PH.forEach(function(p, i) {
      x.font = "26px " + F;
      x.fillStyle = got.has(i) ? "#1b5e20" : "#bbb";
      // 2열 6행 배치 (간격 48px)
      x.fillText((got.has(i) ? "✔ " : "□ ") + (i + 1) + ". " + p[0], 110 + (i % 2) * 520, 595 + Math.floor(i / 2) * 48);
    });

    // 주관식 메모 박스 (체크리스트 아래 여유 있게 배치: y=930, 1240)
    var memos = [
      [930, "가장 놀라웠던 사실", "#fff3c4", "#e65100", $("rFact").value],
      [1240, "나의 실천 다짐", "#dcedc8", "#2e7d32", $("rPledge").value]
    ];
    memos.forEach(function(item) {
      x.fillStyle = item[2];
      x.fillRect(100, item[0] - 45, W - 180, 240);
      x.strokeStyle = item[3];
      x.lineWidth = 4;
      x.strokeRect(100, item[0] - 45, W - 180, 240);
      x.fillStyle = item[3];
      x.font = "bold 32px " + F;
      x.fillText(item[1], 130, item[0] + 5);
      x.fillStyle = "#2b2118";
      x.font = "28px " + F;
      wrap(x, item[4] || "(아직 작성하지 않았어요)", 130, item[0] + 62, W - 260, 44);
    });

    x.textAlign = "center";
    x.fillStyle = "#8d5524";
    x.font = "bold 30px " + F;
    x.fillText("작은 실천이 지구 생태계를 지킵니다", W / 2 + 20, 1630);

    // 스티커 이미지 그리기 (반지름 105 -> 72로 적절하게 축소)
    var stickerSprites = CASES.map(function(c) { return c.sprite; }).concat(['owl', 'medal']);
    var targetSpr = stickerSprites[sticker];
    var img = new Image();
    img.onload = function() {
      var cx = W / 2 + 20;
      var cy = 205;
      var r = 72;
      x.save();
      x.beginPath();
      x.arc(cx, cy, r, 0, Math.PI * 2);
      x.clip();
      x.drawImage(img, cx - r, cy - r, r * 2, r * 2);
      x.restore();
      x.lineWidth = 6;
      x.strokeStyle = "#5d3a14";
      x.beginPath();
      x.arc(cx, cy, r, 0, Math.PI * 2);
      x.stroke();
      if (cb) cb();
    };
    img.onerror = function() { if (cb) cb(); };
    var stampSrc = (window.CHAR_STAMPS && window.CHAR_STAMPS[targetSpr]) ? window.CHAR_STAMPS[targetSpr] :
                   (targetSpr === 'medal' ? PixelArt.getUrl('medal', 10) : "assets/img/char/" + targetSpr + ".png");
    img.src = stampSrc;
  }

  function download() {
    Sound.sfx('click');
    toast("보고서 이미지를 생성하고 있습니다...");

    drawReport(function() {
      var cv = $("cv");
      var fileName = (S.name || "탐정") + "_기후탐정보고서.png";
      var dataUrl = "";
      try {
        dataUrl = cv.toDataURL("image/png");
      } catch (err) {
        console.warn("toDataURL error:", err);
      }

      var triggerDownload = function(url, isBlob) {
        var a = document.createElement("a");
        a.style.display = "none";
        a.href = url;
        a.download = fileName;
        document.body.appendChild(a);
        try {
          a.click();
        } catch (e) {
          console.warn("a.click() failed:", e);
        }
        setTimeout(function() {
          try { document.body.removeChild(a); } catch (e) {}
          if (isBlob) {
            try { URL.revokeObjectURL(url); } catch (e) {}
          }
        }, 1000);
      };

      var executed = false;
      var finishDownload = function(url, isBlob) {
        if (executed) return;
        executed = true;
        if (url) {
          triggerDownload(url, isBlob);
        }
        showSaveSuccessModal(dataUrl || url);
      };

      // 1순위: Blob 기반 파일 다운로드 시도
      if (cv.toBlob) {
        try {
          cv.toBlob(function(blob) {
            if (blob) {
              var blobUrl = URL.createObjectURL(blob);
              finishDownload(blobUrl, true);
            } else if (dataUrl) {
              finishDownload(dataUrl, false);
            } else {
              finishDownload(null, false);
            }
          }, "image/png");
        } catch (e) {
          console.warn("toBlob error:", e);
          if (dataUrl) {
            finishDownload(dataUrl, false);
          }
        }
      } else if (dataUrl) {
        finishDownload(dataUrl, false);
      }

      // 비동기 Blob 콜백 지연이나 차단 시 fallback
      setTimeout(function() {
        if (!executed) {
          finishDownload(dataUrl, false);
        }
      }, 300);
    });
  }

  function showSaveSuccessModal(imgDataUrl) {
    var previewHtml = imgDataUrl ?
      '<div style="margin:12px auto;max-width:320px;border-radius:10px;overflow:hidden;border:3px solid #2e1c0c;box-shadow:0 6px 16px rgba(0,0,0,0.4);">' +
      '  <img src="' + imgDataUrl + '" style="width:100%;display:block;" alt="보고서 미리보기">' +
      '</div>' : '';

    modal(
      PixelArt.getImg('medal', 10),
      "보고서 저장 완료!",
      "보고서 이미지가 기기의 <b>다운로드 폴더</b>에 저장되었습니다.<br>" +
      "<span style=\"font-size:19px;color:#5d3a14;\">(다운로드가 바로 시작되지 않는 경우, 아래 이미지를 <b>길게 눌러 '이미지 저장'</b> 또는 <b>우클릭하여 '다른 이름으로 저장'</b>을 누르세요)</span>" +
      previewHtml,
      [
        ["💾 이미지 다시 받기", function() {
          if (imgDataUrl) {
            var a = document.createElement("a");
            a.style.display = "none";
            a.href = imgDataUrl;
            a.download = (S.name || "탐정") + "_기후탐정보고서.png";
            document.body.appendChild(a);
            a.click();
            setTimeout(function() { try { document.body.removeChild(a); } catch (e) {} }, 500);
          }
        }, "blue"],
        ["새 탭에서 이미지 열기", function() {
          if (imgDataUrl) {
            var win = window.open();
            if (win) {
              win.document.write('<title>기후탐정보고서</title><body style="margin:0;background:#10233a;display:flex;justify-content:center;align-items:center;min-height:100vh;"><img src="' + imgDataUrl + '" style="max-width:95%;height:auto;box-shadow:0 0 20px #000;"></body>');
            }
          }
        }, "gray"],
        ["확인", null, "gray"]
      ]
    );
  }

  // 초기화 시 실행
  if (S.name && S.done.length) {
    renderMap();
  }
  updateSoundBtn();

})();
