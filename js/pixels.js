/**
 * pixels.js - 16비트 레트로 도트 그래픽 렌더러 & 픽셀 아트 에셋 생성기
 * 생태계 탐정단 (Eco Detectives)
 */

(function(window) {
  'use strict';

  // 도트 매트릭스 그리기 헬퍼
  // colors: 색상 팔레트 배열, grid: 문자열 배열 (공백은 투명)
  function drawPixelArt(ctx, grid, palette, x, y, scale) {
    scale = scale || 4;
    for (var r = 0; r < grid.length; r++) {
      var row = grid[r];
      for (var c = 0; c < row.length; c++) {
        var char = row[c];
        if (char !== ' ' && char !== '.') {
          var color = palette[char];
          if (color) {
            ctx.fillStyle = color;
            ctx.fillRect(x + c * scale, y + r * scale, scale, scale);
          }
        }
      }
    }
  }

  // 1. 캐릭터 초상화 매트릭스 (16x16 / 24x24 도트)
  var SPRITES = {
    // 흰동가리 (Clownfish)
    fish: {
      palette: {
        '#': '#1a1a1a', // 외곽선
        'o': '#ff7043', // 주황 본체
        'w': '#ffffff', // 흰색 줄무늬
        'd': '#d84315', // 주황 음영
        'e': '#ffffff', // 눈
        'b': '#111111', // 동공
        'f': '#ffab91'  // 지느러미 하이라이트
      },
      grid: [
        "    ########    ",
        "  ##oooooooo##  ",
        " #oooooowwoooo# ",
        "#oowwoowwwooooo#",
        "#ooweoowwwddddd#",
        "#oowboowwwdoood#",
        "#oowwoowwwddddd#",
        "#ooo#oowwwdoooo#",
        " #oo#oowwwdooo# ",
        "  ## #oowwdoo#  ",
        "    #oowwdoo#   ",
        "   #ffffffff#   ",
        "   ##########   "
      ]
    },

    // 사과 농부 (Farmer)
    farmer: {
      palette: {
        '#': '#2e1c0c',
        'h': '#ffd54f', // 밀짚모자
        'd': '#b57900', // 모자 그림자
        's': '#ffcc80', // 피부
        'e': '#1a1a1a', // 눈
        'w': '#ffffff', // 수건/옷
        'b': '#42a5f5', // 옷 파랑
        'a': '#e53935'  // 사과
      },
      grid: [
        "   ##########   ",
        " ##hhhhhhhhhh## ",
        "#hhhhhhhhhhhhhh#",
        "################",
        "  #ssssssssss#  ",
        "  #seessssees#  ",
        "  #ssssssssss#  ",
        "  #ssswwwss#a#  ",
        "  #swwwwwww#aa# ",
        "  #wwwwwwwww##  ",
        "  #bbbbbbbbbb#  ",
        "  ############  "
      ]
    },

    // 벚꽃 요정 (Blossom Fairy)
    fairy: {
      palette: {
        '#': '#4a1525',
        'p': '#f48fb1', // 벚꽃잎
        'l': '#fce4ec', // 밝은 핑크
        's': '#ffe0b2', // 피부
        'e': '#1a1a1a', // 눈
        'c': '#ffd54f', // 꽃술/화관
        'w': '#ffffff'  // 날개
      },
      grid: [
        "  ##pp####pp##  ",
        " #pppp#cc#pppp# ",
        "#pppplsssspppp# ",
        "#www#sseess#www#",
        "#www#ssssss#www#",
        " #w#pssssssp#w# ",
        "  #pppssspppp#  ",
        "   #pppppppp#   ",
        "    #pp##pp#    ",
        "     ######     "
      ]
    },

    // 북극곰 (Polar Bear)
    bear: {
      palette: {
        '#': '#263238',
        'w': '#ffffff', // 흰 털
        'g': '#cfd8dc', // 털 음영
        'e': '#1a1a1a', // 눈/코
        'p': '#ff8a80'  // 볼
      },
      grid: [
        " ##        ## ",
        "#ww#      #ww#",
        "#www######www#",
        "#wwwwwwwwwwww#",
        "#weewwwwwweew#",
        "#wwwwpeepwwww#",
        "#wwwwwweewwww#",
        " #wwwwwwwwww# ",
        "  #wwwwwwww#  ",
        "   #gwwwwg#   ",
        "    ######    "
      ]
    },

    // 도요새 (Sandpiper)
    bird: {
      palette: {
        '#': '#2e1c0c',
        'b': '#a1887f', // 갈색 깃털
        'l': '#d7ccc8', // 가슴 깃털
        'e': '#111111', // 눈
        'k': '#ff8f00'  // 부리
      },
      grid: [
        "    ######      ",
        "   #bbbbbb#     ",
        "  #bbebbbb#kkkkk",
        "  #bbbbbbbb#kkk ",
        "   #bbbbllll#   ",
        "  #bbbbllllll#  ",
        " #bbbbbbllllll# ",
        " #bbbbbbllllll# ",
        "  ############  "
      ]
    },

    // 고라니 (Water Deer)
    deer: {
      palette: {
        '#': '#2e1c0c',
        'b': '#8d6e63', // 밤색 털
        'w': '#efebe9', // 귀 안쪽
        'e': '#111111', // 눈
        'n': '#3e2723', // 코
        't': '#ffffff'  // 작은 송곳니
      },
      grid: [
        " #ww#    #ww# ",
        "#wwwb####bwww#",
        "#bbbbbbbbbbbb#",
        "#beebbbbbbeeb#",
        "#bbbbbbbbbbbb#",
        " #bbbbnnbbbb# ",
        "  #bbbtbbbb#  ",
        "   ########   "
      ]
    },

    // 농업 연구원 (Scientist)
    scientist: {
      palette: {
        '#': '#1a1a1a',
        'h': '#5d4037', // 머리카락
        's': '#ffe0b2', // 피부
        'g': '#81d4fa', // 안경테
        'e': '#0d47a1', // 눈
        'w': '#ffffff', // 가운
        't': '#00acc1'  // 넥타이
      },
      grid: [
        "   ########   ",
        "  #hhhhhhhh#  ",
        " #hshhhhhhsh# ",
        " #s#gg##gg#s# ",
        " #s#ge##ge#s# ",
        "  #ssssssss#  ",
        "  #swwwwwws#  ",
        "  #wwtwttww#  ",
        "  #wwwwwwww#  "
      ]
    },

    // 펭귄 (Penguin)
    penguin: {
      palette: {
        '#': '#102027',
        'k': '#263238', // 검은 깃털
        'w': '#ffffff', // 배
        'e': '#111111', // 눈
        'b': '#ffa000', // 부리
        'f': '#ffb300'  // 발
      },
      grid: [
        "   ########   ",
        "  #kkkkkkkk#  ",
        " #kkweeeewkk# ",
        " #kkkbbbbkkk# ",
        "#kkwwwwwwwwkk#",
        "#kwwwwwwwwwwk#",
        "#kwwwwwwwwwwk#",
        " #kwwwwwwwwk# ",
        "  #ff####ff#  "
      ]
    },

    // 불꽃 (Fire)
    fire: {
      palette: {
        '#': '#b71c1c',
        'r': '#e53935',
        'o': '#ff9800',
        'y': '#ffeb3b',
        'w': '#ffffff'
      },
      grid: [
        "    ##    ",
        "   #rr#   ",
        "  #roor#  ",
        " #rooyoor#",
        "#royywyoor#",
        "#royywyyor#",
        " #royyyyor#",
        "  #rroorr# ",
        "    ####   "
      ]
    },

    // 해충/애벌레 (Bug)
    bug: {
      palette: {
        '#': '#1b5e20',
        'g': '#43a047',
        'l': '#81c784',
        'e': '#111111',
        'y': '#cddc39'
      },
      grid: [
        "  #  #  ",
        " #g##g# ",
        "#geegge#",
        " #gggg# ",
        "#lyyyyl#",
        " #gggg# ",
        "#lyyyyl#",
        " ###### "
      ]
    },

    // 산호 (Bleached Coral)
    coral: {
      palette: {
        '#': '#37474f',
        'w': '#eceff1',
        's': '#cfd8dc',
        'h': '#ffffff'
      },
      grid: [
        " #w#  #w# ",
        "#hww##hww#",
        " #sww#sww#",
        "  #wwwsw# ",
        "  #hwwsw# ",
        " #swwwsww#",
        "#hwwwwsww#",
        " #######  "
      ]
    },

    // 조개껍데기 (Thin Shell)
    shell: {
      palette: {
        '#': '#4e342e',
        'c': '#ffe0b2',
        'w': '#fff8e1',
        'd': '#d7ccc8'
      },
      grid: [
        "   ######   ",
        " ##cwwcww## ",
        "#c#wc#wc#wc#",
        "#cwwcwwcwwc#",
        "#ccwwccwwcc#",
        " #dccccccd# ",
        "   ######   "
      ]
    },

    // 수온계 (Thermometer)
    therm: {
      palette: {
        '#': '#263238',
        'g': '#ffffff',
        'r': '#e53935',
        't': '#b71c1c'
      },
      grid: [
        "  ###  ",
        " #grg# ",
        " #grg# ",
        " #grg# ",
        "#grrrg#",
        "#rrrrr#",
        "#rttrr#",
        " ##### "
      ]
    },

    // 돋보기 (Magnifying Glass)
    magnifier: {
      palette: {
        '#': '#2e1c0c',
        'b': '#4fc3f7',
        'g': '#e1f5fe',
        'w': '#ffffff',
        'h': '#8d6e63'
      },
      grid: [
        "  ######    ",
        " #wggbbb#   ",
        "#wgbbbbbb#  ",
        "#gbbbbbbb#  ",
        " #bbbbbb#   ",
        "  ######    ",
        "        #h# ",
        "         #h#"
      ]
    },

    // 훈장/메달 (Medal)
    medal: {
      palette: {
        '#': '#b57900',
        'r': '#e53935',
        'b': '#1e88e5',
        'y': '#ffeb3b',
        'g': '#ffd54f',
        'w': '#ffffff'
      },
      grid: [
        " ##    ## ",
        "#rr#  #bb#",
        " #rr##bb# ",
        "  ######  ",
        " #ygggyy# ",
        "#ygwwyggy#",
        "#yggygygy#",
        " #yggggy# ",
        "  ######  "
      ]
    }
  };

  // HTML Data URL (PNG)로 즉각 변환하여 캐싱
  var DATA_URL_CACHE = {};

  function getPixelDataUrl(name, scale) {
    scale = scale || 6;
    var key = name + '_' + scale;
    if (DATA_URL_CACHE[key]) return DATA_URL_CACHE[key];

    var sprite = SPRITES[name];
    if (!sprite) return '';

    var rows = sprite.grid.length;
    var cols = sprite.grid[0].length;
    var c = document.createElement('canvas');
    c.width = cols * scale;
    c.height = rows * scale;
    var ctx = c.getContext('2d');
    ctx.imageSmoothingEnabled = false;

    drawPixelArt(ctx, sprite.grid, sprite.palette, 0, 0, scale);
    var url = c.toDataURL('image/png');
    DATA_URL_CACHE[key] = url;
    return url;
  }

  function getPixelImgTag(name, scale, altClass) {
    var url = getPixelDataUrl(name, scale);
    return '<img src="' + url + '" class="pixel-art-icon ' + (altClass || '') + '" style="image-rendering:pixelated;" alt="' + name + '">';
  }

  window.PixelArt = {
    draw: drawPixelArt,
    sprites: SPRITES,
    getUrl: getPixelDataUrl,
    getImg: getPixelImgTag
  };

})(window);
