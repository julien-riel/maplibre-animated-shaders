window.BENCHMARK_DATA = {
  "lastUpdate": 1767837343248,
  "repoUrl": "https://github.com/julien-riel/maplibre-animated-shaders",
  "entries": {
    "Performance Benchmarks": [
      {
        "commit": {
          "author": {
            "email": "julien.riel@gmail.com",
            "name": "Julien Riel",
            "username": "julien-riel"
          },
          "committer": {
            "email": "julien.riel@gmail.com",
            "name": "Julien Riel",
            "username": "julien-riel"
          },
          "distinct": true,
          "id": "311d81d211a694d7d5b00fbde38f6ae3d0b8a812",
          "message": "chore: trigger benchmark workflow",
          "timestamp": "2026-01-02T21:14:48-05:00",
          "tree_id": "d4c52a4178a408c6737f49ac3006356561255b49",
          "url": "https://github.com/julien-riel/maplibre-animated-shaders/commit/311d81d211a694d7d5b00fbde38f6ae3d0b8a812"
        },
        "date": 1767406552331,
        "tool": "customSmallerIsBetter",
        "benches": [
          {
            "name": "benchmarks/core.bench.ts > ObjectPool - acquire 1,000 points",
            "value": 0.013105772017197254,
            "range": "±0.72%",
            "unit": "ms",
            "extra": "76302.26 ops/sec (38152 samples)"
          },
          {
            "name": "benchmarks/core.bench.ts > ObjectPool - acquire 10,000 points",
            "value": 0.13328014205756483,
            "range": "±0.46%",
            "unit": "ms",
            "extra": "7502.99 ops/sec (3752 samples)"
          },
          {
            "name": "benchmarks/core.bench.ts > ObjectPool - acquire/release cycle 1,000 points",
            "value": 0.008136145602469825,
            "range": "±0.14%",
            "unit": "ms",
            "extra": "122908.32 ops/sec (61455 samples)"
          },
          {
            "name": "benchmarks/core.bench.ts > ObjectPool - acquire 1,000 segments",
            "value": 0.018439730306824855,
            "range": "±0.40%",
            "unit": "ms",
            "extra": "54230.73 ops/sec (27116 samples)"
          },
          {
            "name": "benchmarks/core.bench.ts > ObjectPool - acquire 1,000 polygons",
            "value": 0.06845216303895768,
            "range": "±0.67%",
            "unit": "ms",
            "extra": "14608.74 ops/sec (7305 samples)"
          },
          {
            "name": "benchmarks/core.bench.ts > AnimationLoop - create and destroy",
            "value": 0.00014549703928283997,
            "range": "±0.51%",
            "unit": "ms",
            "extra": "6872992.09 ops/sec (3436497 samples)"
          },
          {
            "name": "benchmarks/core.bench.ts > AnimationLoop - add/remove 100 shaders",
            "value": 0.010590433439930122,
            "range": "±0.99%",
            "unit": "ms",
            "extra": "94424.84 ops/sec (47213 samples)"
          },
          {
            "name": "benchmarks/core.bench.ts > AnimationLoop - tick with 50 shaders",
            "value": 0.003536504020984699,
            "range": "±0.53%",
            "unit": "ms",
            "extra": "282765.12 ops/sec (141383 samples)"
          },
          {
            "name": "benchmarks/core.bench.ts > ShaderRegistry - register 100 shaders",
            "value": 0.012941823153365149,
            "range": "±1.12%",
            "unit": "ms",
            "extra": "77268.87 ops/sec (38638 samples)"
          },
          {
            "name": "benchmarks/core.bench.ts > ShaderRegistry - get shader by name (100 shaders)",
            "value": 0.01158396918730071,
            "range": "±0.88%",
            "unit": "ms",
            "extra": "86326.20 ops/sec (43164 samples)"
          },
          {
            "name": "benchmarks/core.bench.ts > ShaderRegistry - list shaders by geometry",
            "value": 0.022629194107522774,
            "range": "±0.79%",
            "unit": "ms",
            "extra": "44190.70 ops/sec (22096 samples)"
          },
          {
            "name": "benchmarks/core.bench.ts > ConfigResolver - resolve config (simple)",
            "value": 0.00008992077603331246,
            "range": "±0.71%",
            "unit": "ms",
            "extra": "11120900.46 ops/sec (5560451 samples)"
          },
          {
            "name": "benchmarks/core.bench.ts > ConfigResolver - resolve config (full override)",
            "value": 0.00018054620049953442,
            "range": "±0.10%",
            "unit": "ms",
            "extra": "5538748.52 ops/sec (2769375 samples)"
          },
          {
            "name": "benchmarks/core.bench.ts > ConfigResolver - validate config",
            "value": 0.000984160719062151,
            "range": "±0.75%",
            "unit": "ms",
            "extra": "1016094.20 ops/sec (508048 samples)"
          },
          {
            "name": "benchmarks/core.bench.ts > ConfigResolver - resolve + validate 1,000 configs",
            "value": 1.6097864855305766,
            "range": "±1.79%",
            "unit": "ms",
            "extra": "621.20 ops/sec (311 samples)"
          },
          {
            "name": "benchmarks/data-processing.bench.ts > TimeOffsetCalculator - fixed offset (1,000 features)",
            "value": 0.058429479083885585,
            "range": "±1.83%",
            "unit": "ms",
            "extra": "17114.65 ops/sec (8558 samples)"
          },
          {
            "name": "benchmarks/data-processing.bench.ts > TimeOffsetCalculator - random offset (1,000 features)",
            "value": 0.060228491568294205,
            "range": "±0.99%",
            "unit": "ms",
            "extra": "16603.44 ops/sec (8302 samples)"
          },
          {
            "name": "benchmarks/data-processing.bench.ts > TimeOffsetCalculator - range offset (1,000 features)",
            "value": 0.0645837673727735,
            "range": "±0.94%",
            "unit": "ms",
            "extra": "15483.77 ops/sec (7742 samples)"
          },
          {
            "name": "benchmarks/data-processing.bench.ts > TimeOffsetCalculator - property-based offset (1,000 features)",
            "value": 0.06646701954009974,
            "range": "±0.99%",
            "unit": "ms",
            "extra": "15045.06 ops/sec (7523 samples)"
          },
          {
            "name": "benchmarks/data-processing.bench.ts > TimeOffsetCalculator - hash-based offset (1,000 features)",
            "value": 0.08429393374912765,
            "range": "±0.89%",
            "unit": "ms",
            "extra": "11863.25 ops/sec (5932 samples)"
          },
          {
            "name": "benchmarks/data-processing.bench.ts > TimeOffsetCalculator - fixed offset (10,000 features)",
            "value": 0.8034976051364318,
            "range": "±5.43%",
            "unit": "ms",
            "extra": "1244.56 ops/sec (623 samples)"
          },
          {
            "name": "benchmarks/data-processing.bench.ts > TimeOffsetCalculator - hash-based offset (10,000 features)",
            "value": 1.0948684061135536,
            "range": "±3.92%",
            "unit": "ms",
            "extra": "913.35 ops/sec (458 samples)"
          },
          {
            "name": "benchmarks/data-processing.bench.ts > TimeOffsetCalculator - expanded offsets (1,000 features, 4 vertices)",
            "value": 0.0651428069809961,
            "range": "±1.21%",
            "unit": "ms",
            "extra": "15350.89 ops/sec (7678 samples)"
          },
          {
            "name": "benchmarks/data-processing.bench.ts > ExpressionEvaluator - compile simple get expression",
            "value": 0.0022175463798634423,
            "range": "±0.40%",
            "unit": "ms",
            "extra": "450948.85 ops/sec (225475 samples)"
          },
          {
            "name": "benchmarks/data-processing.bench.ts > ExpressionEvaluator - compile match expression",
            "value": 0.01061877250620661,
            "range": "±0.46%",
            "unit": "ms",
            "extra": "94172.84 ops/sec (47087 samples)"
          },
          {
            "name": "benchmarks/data-processing.bench.ts > ExpressionEvaluator - compile interpolate expression",
            "value": 0.008052788954924296,
            "range": "±0.47%",
            "unit": "ms",
            "extra": "124180.58 ops/sec (62091 samples)"
          },
          {
            "name": "benchmarks/data-processing.bench.ts > ExpressionEvaluator - evaluate get (1,000 features)",
            "value": 0.1016688302155584,
            "range": "±1.94%",
            "unit": "ms",
            "extra": "9835.86 ops/sec (4918 samples)"
          },
          {
            "name": "benchmarks/data-processing.bench.ts > ExpressionEvaluator - evaluate match (1,000 features)",
            "value": 0.11571508747977138,
            "range": "±1.35%",
            "unit": "ms",
            "extra": "8641.92 ops/sec (4321 samples)"
          },
          {
            "name": "benchmarks/data-processing.bench.ts > ExpressionEvaluator - evaluate complex (1,000 features)",
            "value": 0.15574339426968295,
            "range": "±1.03%",
            "unit": "ms",
            "extra": "6420.82 ops/sec (3211 samples)"
          },
          {
            "name": "benchmarks/data-processing.bench.ts > ExpressionEvaluator - multiple expressions (1,000 features)",
            "value": 0.27165410157523706,
            "range": "±1.08%",
            "unit": "ms",
            "extra": "3681.15 ops/sec (1841 samples)"
          },
          {
            "name": "benchmarks/data-processing.bench.ts > Color Conversion - hexToRgba (1,000 conversions)",
            "value": 0.16366960327325683,
            "range": "±0.59%",
            "unit": "ms",
            "extra": "6109.87 ops/sec (3055 samples)"
          },
          {
            "name": "benchmarks/data-processing.bench.ts > Color Conversion - rgbaToHex (1,000 conversions)",
            "value": 0.1580226742496223,
            "range": "±0.43%",
            "unit": "ms",
            "extra": "6328.21 ops/sec (3165 samples)"
          },
          {
            "name": "benchmarks/data-processing.bench.ts > Color Conversion - round-trip conversion (1,000 times)",
            "value": 0.3490867494765832,
            "range": "±0.40%",
            "unit": "ms",
            "extra": "2864.62 ops/sec (1433 samples)"
          },
          {
            "name": "benchmarks/data-processing.bench.ts > Coordinate Transformation - lngLat to Mercator (10,000 points)",
            "value": 0.14639911563230765,
            "range": "±0.60%",
            "unit": "ms",
            "extra": "6830.64 ops/sec (3416 samples)"
          },
          {
            "name": "benchmarks/data-processing.bench.ts > Coordinate Transformation - process coordinates array (1,000 lines x 10 pts)",
            "value": 0.3247306337661703,
            "range": "±1.37%",
            "unit": "ms",
            "extra": "3079.48 ops/sec (1540 samples)"
          },
          {
            "name": "benchmarks/data-processing.bench.ts > Buffer Building - Float32Array allocation (1,000 points, 24 bytes each)",
            "value": 0.010547286693664464,
            "range": "±3.62%",
            "unit": "ms",
            "extra": "94811.11 ops/sec (47406 samples)"
          },
          {
            "name": "benchmarks/data-processing.bench.ts > Buffer Building - Float32Array allocation (10,000 points)",
            "value": 0.10099258311455225,
            "range": "±4.74%",
            "unit": "ms",
            "extra": "9901.72 ops/sec (4951 samples)"
          },
          {
            "name": "benchmarks/data-processing.bench.ts > Buffer Building - Float32Array fill (1,000 points)",
            "value": 0.07578839663532647,
            "range": "±0.44%",
            "unit": "ms",
            "extra": "13194.63 ops/sec (6598 samples)"
          },
          {
            "name": "benchmarks/data-processing.bench.ts > Buffer Building - Uint16Array index buffer (1,000 quads)",
            "value": 0.004503213893296894,
            "range": "±1.79%",
            "unit": "ms",
            "extra": "222063.62 ops/sec (111032 samples)"
          },
          {
            "name": "benchmarks/layers.bench.ts > PointShaderLayer - create layer",
            "value": 0.0009162117454545713,
            "range": "±1.00%",
            "unit": "ms",
            "extra": "1091450.75 ops/sec (545726 samples)"
          },
          {
            "name": "benchmarks/layers.bench.ts > PointShaderLayer - onAdd with 100 points",
            "value": 0.01009593873801278,
            "range": "±0.84%",
            "unit": "ms",
            "extra": "99049.73 ops/sec (49525 samples)"
          },
          {
            "name": "benchmarks/layers.bench.ts > PointShaderLayer - onAdd with 1,000 points",
            "value": 0.05996375164888276,
            "range": "±1.39%",
            "unit": "ms",
            "extra": "16676.74 ops/sec (8339 samples)"
          },
          {
            "name": "benchmarks/layers.bench.ts > PointShaderLayer - onAdd with 10,000 points",
            "value": 0.9231712025782662,
            "range": "±5.91%",
            "unit": "ms",
            "extra": "1083.22 ops/sec (543 samples)"
          },
          {
            "name": "benchmarks/layers.bench.ts > PointShaderLayer - render cycle (1,000 points)",
            "value": 0.06530483818727927,
            "range": "±1.39%",
            "unit": "ms",
            "extra": "15312.80 ops/sec (7657 samples)"
          },
          {
            "name": "benchmarks/layers.bench.ts > PointShaderLayer - updateConfig (1,000 points)",
            "value": 0.13652171362270604,
            "range": "±1.13%",
            "unit": "ms",
            "extra": "7324.84 ops/sec (3663 samples)"
          },
          {
            "name": "benchmarks/layers.bench.ts > LineShaderLayer - create layer",
            "value": 0.0009995966269631805,
            "range": "±0.43%",
            "unit": "ms",
            "extra": "1000403.54 ops/sec (500202 samples)"
          },
          {
            "name": "benchmarks/layers.bench.ts > LineShaderLayer - onAdd with 100 lines (10 pts each)",
            "value": 0.023961403843386467,
            "range": "±0.91%",
            "unit": "ms",
            "extra": "41733.78 ops/sec (20867 samples)"
          },
          {
            "name": "benchmarks/layers.bench.ts > LineShaderLayer - onAdd with 1,000 lines (10 pts each)",
            "value": 0.2099749109991678,
            "range": "±1.97%",
            "unit": "ms",
            "extra": "4762.47 ops/sec (2382 samples)"
          },
          {
            "name": "benchmarks/layers.bench.ts > LineShaderLayer - onAdd with 100 lines (100 pts each)",
            "value": 0.18247010726012422,
            "range": "±1.86%",
            "unit": "ms",
            "extra": "5480.35 ops/sec (2741 samples)"
          },
          {
            "name": "benchmarks/layers.bench.ts > LineShaderLayer - render cycle (1,000 lines)",
            "value": 0.20696354263245118,
            "range": "±1.95%",
            "unit": "ms",
            "extra": "4831.77 ops/sec (2416 samples)"
          },
          {
            "name": "benchmarks/layers.bench.ts > PolygonShaderLayer - create layer",
            "value": 0.0009987584145316859,
            "range": "±0.19%",
            "unit": "ms",
            "extra": "1001243.13 ops/sec (500622 samples)"
          },
          {
            "name": "benchmarks/layers.bench.ts > PolygonShaderLayer - onAdd with 100 polygons (6 vertices)",
            "value": 0.027417151121351256,
            "range": "±1.85%",
            "unit": "ms",
            "extra": "36473.52 ops/sec (18237 samples)"
          },
          {
            "name": "benchmarks/layers.bench.ts > PolygonShaderLayer - onAdd with 1,000 polygons (6 vertices)",
            "value": 0.2312878482886536,
            "range": "±1.22%",
            "unit": "ms",
            "extra": "4323.62 ops/sec (2162 samples)"
          },
          {
            "name": "benchmarks/layers.bench.ts > PolygonShaderLayer - onAdd with 100 polygons (20 vertices)",
            "value": 0.0685681689291115,
            "range": "±0.97%",
            "unit": "ms",
            "extra": "14584.03 ops/sec (7293 samples)"
          },
          {
            "name": "benchmarks/layers.bench.ts > PolygonShaderLayer - render cycle (1,000 polygons)",
            "value": 0.22367279740608031,
            "range": "±1.22%",
            "unit": "ms",
            "extra": "4470.82 ops/sec (2236 samples)"
          },
          {
            "name": "benchmarks/layers.bench.ts > PolygonShaderLayer - triangulation (complex polygon 50 vertices)",
            "value": 0.16301774608864125,
            "range": "±1.41%",
            "unit": "ms",
            "extra": "6134.30 ops/sec (3068 samples)"
          },
          {
            "name": "benchmarks/layers.bench.ts > Layer Comparison - 1,000 points - full lifecycle",
            "value": 0.06123343338232872,
            "range": "±1.40%",
            "unit": "ms",
            "extra": "16330.95 ops/sec (8166 samples)"
          },
          {
            "name": "benchmarks/layers.bench.ts > Layer Comparison - 1,000 lines - full lifecycle",
            "value": 0.206377451506388,
            "range": "±1.94%",
            "unit": "ms",
            "extra": "4845.49 ops/sec (2423 samples)"
          },
          {
            "name": "benchmarks/layers.bench.ts > Layer Comparison - 1,000 polygons - full lifecycle",
            "value": 0.22595313330321215,
            "range": "±1.21%",
            "unit": "ms",
            "extra": "4425.70 ops/sec (2213 samples)"
          }
        ]
      },
      {
        "commit": {
          "author": {
            "email": "julien.riel@gmail.com",
            "name": "Julien Riel",
            "username": "julien-riel"
          },
          "committer": {
            "email": "julien.riel@gmail.com",
            "name": "Julien Riel",
            "username": "julien-riel"
          },
          "distinct": true,
          "id": "dfde12e13dc0385115218f7a889de3b059fb091d",
          "message": "feat: add package.json files for temporary Vite dependencies and update logging in ShaderManager, PluginManager, and WebGL utilities",
          "timestamp": "2026-01-02T22:11:35-05:00",
          "tree_id": "021141c5ce2bb327d34858f2405e26c79f692263",
          "url": "https://github.com/julien-riel/maplibre-animated-shaders/commit/dfde12e13dc0385115218f7a889de3b059fb091d"
        },
        "date": 1767409962018,
        "tool": "customSmallerIsBetter",
        "benches": [
          {
            "name": "benchmarks/core.bench.ts > ObjectPool - acquire 1,000 points",
            "value": 0.013384381963249273,
            "range": "±0.97%",
            "unit": "ms",
            "extra": "74713.95 ops/sec (37357 samples)"
          },
          {
            "name": "benchmarks/core.bench.ts > ObjectPool - acquire 10,000 points",
            "value": 0.13369406791443128,
            "range": "±0.41%",
            "unit": "ms",
            "extra": "7479.76 ops/sec (3740 samples)"
          },
          {
            "name": "benchmarks/core.bench.ts > ObjectPool - acquire/release cycle 1,000 points",
            "value": 0.008134369948601033,
            "range": "±0.14%",
            "unit": "ms",
            "extra": "122935.15 ops/sec (61468 samples)"
          },
          {
            "name": "benchmarks/core.bench.ts > ObjectPool - acquire 1,000 segments",
            "value": 0.018745877146278164,
            "range": "±0.41%",
            "unit": "ms",
            "extra": "53345.06 ops/sec (26674 samples)"
          },
          {
            "name": "benchmarks/core.bench.ts > ObjectPool - acquire 1,000 polygons",
            "value": 0.059071266154751036,
            "range": "±0.39%",
            "unit": "ms",
            "extra": "16928.70 ops/sec (8465 samples)"
          },
          {
            "name": "benchmarks/core.bench.ts > AnimationLoop - create and destroy",
            "value": 0.0001463035978071244,
            "range": "±0.47%",
            "unit": "ms",
            "extra": "6835101.90 ops/sec (3417551 samples)"
          },
          {
            "name": "benchmarks/core.bench.ts > AnimationLoop - add/remove 100 shaders",
            "value": 0.010664454314734936,
            "range": "±0.63%",
            "unit": "ms",
            "extra": "93769.45 ops/sec (46886 samples)"
          },
          {
            "name": "benchmarks/core.bench.ts > AnimationLoop - tick with 50 shaders",
            "value": 0.003436612806115712,
            "range": "±0.48%",
            "unit": "ms",
            "extra": "290984.19 ops/sec (145493 samples)"
          },
          {
            "name": "benchmarks/core.bench.ts > ShaderRegistry - register 100 shaders",
            "value": 0.012718652303295792,
            "range": "±1.03%",
            "unit": "ms",
            "extra": "78624.68 ops/sec (39313 samples)"
          },
          {
            "name": "benchmarks/core.bench.ts > ShaderRegistry - get shader by name (100 shaders)",
            "value": 0.010991530959474523,
            "range": "±0.86%",
            "unit": "ms",
            "extra": "90979.14 ops/sec (45495 samples)"
          },
          {
            "name": "benchmarks/core.bench.ts > ShaderRegistry - list shaders by geometry",
            "value": 0.021695204234808408,
            "range": "±0.76%",
            "unit": "ms",
            "extra": "46093.14 ops/sec (23047 samples)"
          },
          {
            "name": "benchmarks/core.bench.ts > ConfigResolver - resolve config (simple)",
            "value": 0.00009112970696999252,
            "range": "±0.84%",
            "unit": "ms",
            "extra": "10973370.08 ops/sec (5486729 samples)"
          },
          {
            "name": "benchmarks/core.bench.ts > ConfigResolver - resolve config (full override)",
            "value": 0.00018700007816367428,
            "range": "±0.20%",
            "unit": "ms",
            "extra": "5347591.35 ops/sec (2673796 samples)"
          },
          {
            "name": "benchmarks/core.bench.ts > ConfigResolver - validate config",
            "value": 0.0009117468207489981,
            "range": "±0.60%",
            "unit": "ms",
            "extra": "1096795.71 ops/sec (548398 samples)"
          },
          {
            "name": "benchmarks/core.bench.ts > ConfigResolver - resolve + validate 1,000 configs",
            "value": 1.4231734119320292,
            "range": "±1.33%",
            "unit": "ms",
            "extra": "702.66 ops/sec (352 samples)"
          },
          {
            "name": "benchmarks/data-processing.bench.ts > TimeOffsetCalculator - fixed offset (1,000 features)",
            "value": 0.056957858070398035,
            "range": "±1.65%",
            "unit": "ms",
            "extra": "17556.84 ops/sec (8779 samples)"
          },
          {
            "name": "benchmarks/data-processing.bench.ts > TimeOffsetCalculator - random offset (1,000 features)",
            "value": 0.05907537275521099,
            "range": "±0.97%",
            "unit": "ms",
            "extra": "16927.53 ops/sec (8464 samples)"
          },
          {
            "name": "benchmarks/data-processing.bench.ts > TimeOffsetCalculator - range offset (1,000 features)",
            "value": 0.06809989214215763,
            "range": "±0.95%",
            "unit": "ms",
            "extra": "14684.31 ops/sec (7343 samples)"
          },
          {
            "name": "benchmarks/data-processing.bench.ts > TimeOffsetCalculator - property-based offset (1,000 features)",
            "value": 0.06821961432467973,
            "range": "±1.06%",
            "unit": "ms",
            "extra": "14658.54 ops/sec (7330 samples)"
          },
          {
            "name": "benchmarks/data-processing.bench.ts > TimeOffsetCalculator - hash-based offset (1,000 features)",
            "value": 0.08455276378082312,
            "range": "±0.91%",
            "unit": "ms",
            "extra": "11826.93 ops/sec (5914 samples)"
          },
          {
            "name": "benchmarks/data-processing.bench.ts > TimeOffsetCalculator - fixed offset (10,000 features)",
            "value": 0.7580046742424781,
            "range": "±4.66%",
            "unit": "ms",
            "extra": "1319.25 ops/sec (660 samples)"
          },
          {
            "name": "benchmarks/data-processing.bench.ts > TimeOffsetCalculator - hash-based offset (10,000 features)",
            "value": 1.0883226543477735,
            "range": "±3.77%",
            "unit": "ms",
            "extra": "918.85 ops/sec (460 samples)"
          },
          {
            "name": "benchmarks/data-processing.bench.ts > TimeOffsetCalculator - expanded offsets (1,000 features, 4 vertices)",
            "value": 0.06433504722078626,
            "range": "±1.21%",
            "unit": "ms",
            "extra": "15543.63 ops/sec (7772 samples)"
          },
          {
            "name": "benchmarks/data-processing.bench.ts > ExpressionEvaluator - compile simple get expression",
            "value": 0.002075018579694518,
            "range": "±0.41%",
            "unit": "ms",
            "extra": "481923.40 ops/sec (240962 samples)"
          },
          {
            "name": "benchmarks/data-processing.bench.ts > ExpressionEvaluator - compile match expression",
            "value": 0.011098605935494336,
            "range": "±0.52%",
            "unit": "ms",
            "extra": "90101.41 ops/sec (45051 samples)"
          },
          {
            "name": "benchmarks/data-processing.bench.ts > ExpressionEvaluator - compile interpolate expression",
            "value": 0.007695075503638116,
            "range": "±0.49%",
            "unit": "ms",
            "extra": "129953.24 ops/sec (64977 samples)"
          },
          {
            "name": "benchmarks/data-processing.bench.ts > ExpressionEvaluator - evaluate get (1,000 features)",
            "value": 0.09520741336632264,
            "range": "±1.23%",
            "unit": "ms",
            "extra": "10503.38 ops/sec (5252 samples)"
          },
          {
            "name": "benchmarks/data-processing.bench.ts > ExpressionEvaluator - evaluate match (1,000 features)",
            "value": 0.12187002315380356,
            "range": "±1.49%",
            "unit": "ms",
            "extra": "8205.46 ops/sec (4103 samples)"
          },
          {
            "name": "benchmarks/data-processing.bench.ts > ExpressionEvaluator - evaluate complex (1,000 features)",
            "value": 0.15607771254686786,
            "range": "±1.12%",
            "unit": "ms",
            "extra": "6407.06 ops/sec (3204 samples)"
          },
          {
            "name": "benchmarks/data-processing.bench.ts > ExpressionEvaluator - multiple expressions (1,000 features)",
            "value": 0.27566162899667224,
            "range": "±1.05%",
            "unit": "ms",
            "extra": "3627.64 ops/sec (1814 samples)"
          },
          {
            "name": "benchmarks/data-processing.bench.ts > Color Conversion - hexToRgba (1,000 conversions)",
            "value": 0.1749388020286771,
            "range": "±0.90%",
            "unit": "ms",
            "extra": "5716.28 ops/sec (2859 samples)"
          },
          {
            "name": "benchmarks/data-processing.bench.ts > Color Conversion - rgbaToHex (1,000 conversions)",
            "value": 0.16214605447472286,
            "range": "±0.42%",
            "unit": "ms",
            "extra": "6167.28 ops/sec (3084 samples)"
          },
          {
            "name": "benchmarks/data-processing.bench.ts > Color Conversion - round-trip conversion (1,000 times)",
            "value": 0.3431150617283909,
            "range": "±0.39%",
            "unit": "ms",
            "extra": "2914.47 ops/sec (1458 samples)"
          },
          {
            "name": "benchmarks/data-processing.bench.ts > Coordinate Transformation - lngLat to Mercator (10,000 points)",
            "value": 0.14585971295216116,
            "range": "±0.40%",
            "unit": "ms",
            "extra": "6855.90 ops/sec (3428 samples)"
          },
          {
            "name": "benchmarks/data-processing.bench.ts > Coordinate Transformation - process coordinates array (1,000 lines x 10 pts)",
            "value": 0.3011584545454184,
            "range": "±0.97%",
            "unit": "ms",
            "extra": "3320.51 ops/sec (1661 samples)"
          },
          {
            "name": "benchmarks/data-processing.bench.ts > Buffer Building - Float32Array allocation (1,000 points, 24 bytes each)",
            "value": 0.012776031658839504,
            "range": "±4.68%",
            "unit": "ms",
            "extra": "78271.57 ops/sec (39136 samples)"
          },
          {
            "name": "benchmarks/data-processing.bench.ts > Buffer Building - Float32Array allocation (10,000 points)",
            "value": 0.08592803811158434,
            "range": "±4.37%",
            "unit": "ms",
            "extra": "11637.64 ops/sec (5825 samples)"
          },
          {
            "name": "benchmarks/data-processing.bench.ts > Buffer Building - Float32Array fill (1,000 points)",
            "value": 0.07510676614600365,
            "range": "±0.40%",
            "unit": "ms",
            "extra": "13314.38 ops/sec (6658 samples)"
          },
          {
            "name": "benchmarks/data-processing.bench.ts > Buffer Building - Uint16Array index buffer (1,000 quads)",
            "value": 0.004600260824363422,
            "range": "±2.30%",
            "unit": "ms",
            "extra": "217378.98 ops/sec (108690 samples)"
          },
          {
            "name": "benchmarks/layers.bench.ts > PointShaderLayer - create layer",
            "value": 0.0008811267481530599,
            "range": "±0.60%",
            "unit": "ms",
            "extra": "1134910.50 ops/sec (567456 samples)"
          },
          {
            "name": "benchmarks/layers.bench.ts > PointShaderLayer - onAdd with 100 points",
            "value": 0.009892290651894134,
            "range": "±0.81%",
            "unit": "ms",
            "extra": "101088.82 ops/sec (50545 samples)"
          },
          {
            "name": "benchmarks/layers.bench.ts > PointShaderLayer - onAdd with 1,000 points",
            "value": 0.06001951254351639,
            "range": "±1.41%",
            "unit": "ms",
            "extra": "16661.25 ops/sec (8331 samples)"
          },
          {
            "name": "benchmarks/layers.bench.ts > PointShaderLayer - onAdd with 10,000 points",
            "value": 0.803724333868384,
            "range": "±5.21%",
            "unit": "ms",
            "extra": "1244.21 ops/sec (623 samples)"
          },
          {
            "name": "benchmarks/layers.bench.ts > PointShaderLayer - render cycle (1,000 points)",
            "value": 0.060454472494261405,
            "range": "±1.32%",
            "unit": "ms",
            "extra": "16541.37 ops/sec (8271 samples)"
          },
          {
            "name": "benchmarks/layers.bench.ts > PointShaderLayer - updateConfig (1,000 points)",
            "value": 0.12413743247268862,
            "range": "±1.03%",
            "unit": "ms",
            "extra": "8055.59 ops/sec (4028 samples)"
          },
          {
            "name": "benchmarks/layers.bench.ts > LineShaderLayer - create layer",
            "value": 0.0009719409760222587,
            "range": "±0.52%",
            "unit": "ms",
            "extra": "1028869.06 ops/sec (514435 samples)"
          },
          {
            "name": "benchmarks/layers.bench.ts > LineShaderLayer - onAdd with 100 lines (10 pts each)",
            "value": 0.022950643716149233,
            "range": "±0.88%",
            "unit": "ms",
            "extra": "43571.76 ops/sec (21786 samples)"
          },
          {
            "name": "benchmarks/layers.bench.ts > LineShaderLayer - onAdd with 1,000 lines (10 pts each)",
            "value": 0.24019834197885925,
            "range": "±2.34%",
            "unit": "ms",
            "extra": "4163.23 ops/sec (2082 samples)"
          },
          {
            "name": "benchmarks/layers.bench.ts > LineShaderLayer - onAdd with 100 lines (100 pts each)",
            "value": 0.18231351330659729,
            "range": "±1.85%",
            "unit": "ms",
            "extra": "5485.06 ops/sec (2743 samples)"
          },
          {
            "name": "benchmarks/layers.bench.ts > LineShaderLayer - render cycle (1,000 lines)",
            "value": 0.23322941604478364,
            "range": "±2.29%",
            "unit": "ms",
            "extra": "4287.62 ops/sec (2144 samples)"
          },
          {
            "name": "benchmarks/layers.bench.ts > PolygonShaderLayer - create layer",
            "value": 0.0010046481945465038,
            "range": "±1.05%",
            "unit": "ms",
            "extra": "995373.31 ops/sec (497687 samples)"
          },
          {
            "name": "benchmarks/layers.bench.ts > PolygonShaderLayer - onAdd with 100 polygons (6 vertices)",
            "value": 0.025445446005088312,
            "range": "±0.66%",
            "unit": "ms",
            "extra": "39299.76 ops/sec (19650 samples)"
          },
          {
            "name": "benchmarks/layers.bench.ts > PolygonShaderLayer - onAdd with 1,000 polygons (6 vertices)",
            "value": 0.23174860797034036,
            "range": "±1.25%",
            "unit": "ms",
            "extra": "4315.02 ops/sec (2158 samples)"
          },
          {
            "name": "benchmarks/layers.bench.ts > PolygonShaderLayer - onAdd with 100 polygons (20 vertices)",
            "value": 0.06768033987548945,
            "range": "±0.95%",
            "unit": "ms",
            "extra": "14775.34 ops/sec (7388 samples)"
          },
          {
            "name": "benchmarks/layers.bench.ts > PolygonShaderLayer - render cycle (1,000 polygons)",
            "value": 0.22296554034775018,
            "range": "±1.20%",
            "unit": "ms",
            "extra": "4485.00 ops/sec (2243 samples)"
          },
          {
            "name": "benchmarks/layers.bench.ts > PolygonShaderLayer - triangulation (complex polygon 50 vertices)",
            "value": 0.1616362950872687,
            "range": "±1.37%",
            "unit": "ms",
            "extra": "6186.73 ops/sec (3094 samples)"
          },
          {
            "name": "benchmarks/layers.bench.ts > Layer Comparison - 1,000 points - full lifecycle",
            "value": 0.05881678306878802,
            "range": "±1.37%",
            "unit": "ms",
            "extra": "17001.95 ops/sec (8505 samples)"
          },
          {
            "name": "benchmarks/layers.bench.ts > Layer Comparison - 1,000 lines - full lifecycle",
            "value": 0.20290066734281378,
            "range": "±1.91%",
            "unit": "ms",
            "extra": "4928.52 ops/sec (2465 samples)"
          },
          {
            "name": "benchmarks/layers.bench.ts > Layer Comparison - 1,000 polygons - full lifecycle",
            "value": 0.22152600088575256,
            "range": "±1.16%",
            "unit": "ms",
            "extra": "4514.14 ops/sec (2258 samples)"
          }
        ]
      },
      {
        "commit": {
          "author": {
            "email": "julien.riel@gmail.com",
            "name": "Julien Riel",
            "username": "julien-riel"
          },
          "committer": {
            "email": "julien.riel@gmail.com",
            "name": "Julien Riel",
            "username": "julien-riel"
          },
          "distinct": true,
          "id": "93274bcd58af1221829841d1dd4ee3bd3823a933",
          "message": "Add comprehensive tests for GLSL loader and uniform extractor utilities\n\n- Implement tests for GLSL loader functions including registerGLSLInclude, processGLSL, createShaderProgram, getDefaultVertexShader, and getPrecisionHeader.\n- Add tests for GLSL uniform extractor functions such as extractUniforms, extractUniformNames, validateUniforms, getUniformSetterInfo, and createUniformCache.\n- Enhance existing tests for LineShaderLayer and PolygonShaderLayer to cover feature processing and rendering.\n- Introduce tests for MapLibre helper utilities including getLayerCenter, layerExists, getLayerGeometryType, waitForMapLoad, waitForLayer, getZoom, and getCanvasSize.\n- Create tests for throttle and debounce utilities to ensure correct functionality.\n- Add tests for WebGL capabilities detection focusing on logCapabilities.\n- Adjust coverage thresholds in vitest configuration.",
          "timestamp": "2026-01-02T22:31:50-05:00",
          "tree_id": "6faf846bfc658f17cbad5a02ddc3ce9c097e5a18",
          "url": "https://github.com/julien-riel/maplibre-animated-shaders/commit/93274bcd58af1221829841d1dd4ee3bd3823a933"
        },
        "date": 1767411176486,
        "tool": "customSmallerIsBetter",
        "benches": [
          {
            "name": "benchmarks/core.bench.ts > ObjectPool - acquire 1,000 points",
            "value": 0.013301825826701709,
            "range": "±0.75%",
            "unit": "ms",
            "extra": "75177.65 ops/sec (37589 samples)"
          },
          {
            "name": "benchmarks/core.bench.ts > ObjectPool - acquire 10,000 points",
            "value": 0.13410134191470358,
            "range": "±0.59%",
            "unit": "ms",
            "extra": "7457.05 ops/sec (3729 samples)"
          },
          {
            "name": "benchmarks/core.bench.ts > ObjectPool - acquire/release cycle 1,000 points",
            "value": 0.008132974235100104,
            "range": "±0.07%",
            "unit": "ms",
            "extra": "122956.25 ops/sec (61479 samples)"
          },
          {
            "name": "benchmarks/core.bench.ts > ObjectPool - acquire 1,000 segments",
            "value": 0.018515584114046378,
            "range": "±0.42%",
            "unit": "ms",
            "extra": "54008.56 ops/sec (27005 samples)"
          },
          {
            "name": "benchmarks/core.bench.ts > ObjectPool - acquire 1,000 polygons",
            "value": 0.058900688302502766,
            "range": "±0.37%",
            "unit": "ms",
            "extra": "16977.73 ops/sec (8489 samples)"
          },
          {
            "name": "benchmarks/core.bench.ts > AnimationLoop - create and destroy",
            "value": 0.00014444528254980247,
            "range": "±0.77%",
            "unit": "ms",
            "extra": "6923036.75 ops/sec (3461519 samples)"
          },
          {
            "name": "benchmarks/core.bench.ts > AnimationLoop - add/remove 100 shaders",
            "value": 0.009301015904600982,
            "range": "±0.54%",
            "unit": "ms",
            "extra": "107515.14 ops/sec (53758 samples)"
          },
          {
            "name": "benchmarks/core.bench.ts > AnimationLoop - tick with 50 shaders",
            "value": 0.003959232136080376,
            "range": "±0.90%",
            "unit": "ms",
            "extra": "252574.23 ops/sec (126288 samples)"
          },
          {
            "name": "benchmarks/core.bench.ts > ShaderRegistry - register 100 shaders",
            "value": 0.010507743727687587,
            "range": "±1.21%",
            "unit": "ms",
            "extra": "95167.91 ops/sec (47590 samples)"
          },
          {
            "name": "benchmarks/core.bench.ts > ShaderRegistry - get shader by name (100 shaders)",
            "value": 0.011373931211778368,
            "range": "±0.85%",
            "unit": "ms",
            "extra": "87920.35 ops/sec (43961 samples)"
          },
          {
            "name": "benchmarks/core.bench.ts > ShaderRegistry - list shaders by geometry",
            "value": 0.022131787181285133,
            "range": "±0.86%",
            "unit": "ms",
            "extra": "45183.88 ops/sec (22592 samples)"
          },
          {
            "name": "benchmarks/core.bench.ts > ConfigResolver - resolve config (simple)",
            "value": 0.00009214375309640242,
            "range": "±1.13%",
            "unit": "ms",
            "extra": "10852607.65 ops/sec (5426304 samples)"
          },
          {
            "name": "benchmarks/core.bench.ts > ConfigResolver - resolve config (full override)",
            "value": 0.00017916989817422008,
            "range": "±0.17%",
            "unit": "ms",
            "extra": "5581294.68 ops/sec (2790648 samples)"
          },
          {
            "name": "benchmarks/core.bench.ts > ConfigResolver - validate config",
            "value": 0.0009816501618731186,
            "range": "±0.67%",
            "unit": "ms",
            "extra": "1018692.85 ops/sec (509347 samples)"
          },
          {
            "name": "benchmarks/core.bench.ts > ConfigResolver - resolve + validate 1,000 configs",
            "value": 1.499714182634541,
            "range": "±0.60%",
            "unit": "ms",
            "extra": "666.79 ops/sec (334 samples)"
          },
          {
            "name": "benchmarks/data-processing.bench.ts > TimeOffsetCalculator - fixed offset (1,000 features)",
            "value": 0.05695664768198445,
            "range": "±1.69%",
            "unit": "ms",
            "extra": "17557.21 ops/sec (8779 samples)"
          },
          {
            "name": "benchmarks/data-processing.bench.ts > TimeOffsetCalculator - random offset (1,000 features)",
            "value": 0.060361477788524326,
            "range": "±1.01%",
            "unit": "ms",
            "extra": "16566.86 ops/sec (8284 samples)"
          },
          {
            "name": "benchmarks/data-processing.bench.ts > TimeOffsetCalculator - range offset (1,000 features)",
            "value": 0.06478223850240292,
            "range": "±0.96%",
            "unit": "ms",
            "extra": "15436.33 ops/sec (7719 samples)"
          },
          {
            "name": "benchmarks/data-processing.bench.ts > TimeOffsetCalculator - property-based offset (1,000 features)",
            "value": 0.06540816873771038,
            "range": "±1.03%",
            "unit": "ms",
            "extra": "15288.61 ops/sec (7645 samples)"
          },
          {
            "name": "benchmarks/data-processing.bench.ts > TimeOffsetCalculator - hash-based offset (1,000 features)",
            "value": 0.08374815302193539,
            "range": "±0.91%",
            "unit": "ms",
            "extra": "11940.56 ops/sec (5973 samples)"
          },
          {
            "name": "benchmarks/data-processing.bench.ts > TimeOffsetCalculator - fixed offset (10,000 features)",
            "value": 0.7492480853293682,
            "range": "±4.57%",
            "unit": "ms",
            "extra": "1334.67 ops/sec (668 samples)"
          },
          {
            "name": "benchmarks/data-processing.bench.ts > TimeOffsetCalculator - hash-based offset (10,000 features)",
            "value": 1.0910905904139467,
            "range": "±3.79%",
            "unit": "ms",
            "extra": "916.51 ops/sec (459 samples)"
          },
          {
            "name": "benchmarks/data-processing.bench.ts > TimeOffsetCalculator - expanded offsets (1,000 features, 4 vertices)",
            "value": 0.06422439005909314,
            "range": "±1.22%",
            "unit": "ms",
            "extra": "15570.41 ops/sec (7786 samples)"
          },
          {
            "name": "benchmarks/data-processing.bench.ts > ExpressionEvaluator - compile simple get expression",
            "value": 0.0021047451327901316,
            "range": "±0.41%",
            "unit": "ms",
            "extra": "475116.91 ops/sec (237559 samples)"
          },
          {
            "name": "benchmarks/data-processing.bench.ts > ExpressionEvaluator - compile match expression",
            "value": 0.010553181869990326,
            "range": "±0.49%",
            "unit": "ms",
            "extra": "94758.15 ops/sec (47380 samples)"
          },
          {
            "name": "benchmarks/data-processing.bench.ts > ExpressionEvaluator - compile interpolate expression",
            "value": 0.007791507300593843,
            "range": "±0.50%",
            "unit": "ms",
            "extra": "128344.87 ops/sec (64173 samples)"
          },
          {
            "name": "benchmarks/data-processing.bench.ts > ExpressionEvaluator - evaluate get (1,000 features)",
            "value": 0.09740572458122719,
            "range": "±1.41%",
            "unit": "ms",
            "extra": "10266.34 ops/sec (5134 samples)"
          },
          {
            "name": "benchmarks/data-processing.bench.ts > ExpressionEvaluator - evaluate match (1,000 features)",
            "value": 0.11565057816836968,
            "range": "±1.45%",
            "unit": "ms",
            "extra": "8646.74 ops/sec (4324 samples)"
          },
          {
            "name": "benchmarks/data-processing.bench.ts > ExpressionEvaluator - evaluate complex (1,000 features)",
            "value": 0.16166464500486857,
            "range": "±1.25%",
            "unit": "ms",
            "extra": "6185.64 ops/sec (3093 samples)"
          },
          {
            "name": "benchmarks/data-processing.bench.ts > ExpressionEvaluator - multiple expressions (1,000 features)",
            "value": 0.2750278839383548,
            "range": "±1.19%",
            "unit": "ms",
            "extra": "3635.99 ops/sec (1818 samples)"
          },
          {
            "name": "benchmarks/data-processing.bench.ts > Color Conversion - hexToRgba (1,000 conversions)",
            "value": 0.1785091763025896,
            "range": "±0.97%",
            "unit": "ms",
            "extra": "5601.95 ops/sec (2802 samples)"
          },
          {
            "name": "benchmarks/data-processing.bench.ts > Color Conversion - rgbaToHex (1,000 conversions)",
            "value": 0.157880229554784,
            "range": "±0.46%",
            "unit": "ms",
            "extra": "6333.92 ops/sec (3167 samples)"
          },
          {
            "name": "benchmarks/data-processing.bench.ts > Color Conversion - round-trip conversion (1,000 times)",
            "value": 0.3577338884120511,
            "range": "±0.44%",
            "unit": "ms",
            "extra": "2795.37 ops/sec (1398 samples)"
          },
          {
            "name": "benchmarks/data-processing.bench.ts > Coordinate Transformation - lngLat to Mercator (10,000 points)",
            "value": 0.1447981372321942,
            "range": "±0.56%",
            "unit": "ms",
            "extra": "6906.17 ops/sec (3454 samples)"
          },
          {
            "name": "benchmarks/data-processing.bench.ts > Coordinate Transformation - process coordinates array (1,000 lines x 10 pts)",
            "value": 0.31049899627558286,
            "range": "±1.15%",
            "unit": "ms",
            "extra": "3220.62 ops/sec (1611 samples)"
          },
          {
            "name": "benchmarks/data-processing.bench.ts > Buffer Building - Float32Array allocation (1,000 points, 24 bytes each)",
            "value": 0.006247510220912303,
            "range": "±2.41%",
            "unit": "ms",
            "extra": "160063.76 ops/sec (80032 samples)"
          },
          {
            "name": "benchmarks/data-processing.bench.ts > Buffer Building - Float32Array allocation (10,000 points)",
            "value": 0.05140992453221202,
            "range": "±0.98%",
            "unit": "ms",
            "extra": "19451.50 ops/sec (9726 samples)"
          },
          {
            "name": "benchmarks/data-processing.bench.ts > Buffer Building - Float32Array fill (1,000 points)",
            "value": 0.07784612969015926,
            "range": "±0.56%",
            "unit": "ms",
            "extra": "12845.85 ops/sec (6423 samples)"
          },
          {
            "name": "benchmarks/data-processing.bench.ts > Buffer Building - Uint16Array index buffer (1,000 quads)",
            "value": 0.00473183403679442,
            "range": "±2.86%",
            "unit": "ms",
            "extra": "211334.55 ops/sec (105668 samples)"
          },
          {
            "name": "benchmarks/layers.bench.ts > PointShaderLayer - create layer",
            "value": 0.0008946308665388723,
            "range": "±0.68%",
            "unit": "ms",
            "extra": "1117779.45 ops/sec (558890 samples)"
          },
          {
            "name": "benchmarks/layers.bench.ts > PointShaderLayer - onAdd with 100 points",
            "value": 0.010002705183347178,
            "range": "±0.75%",
            "unit": "ms",
            "extra": "99972.96 ops/sec (49987 samples)"
          },
          {
            "name": "benchmarks/layers.bench.ts > PointShaderLayer - onAdd with 1,000 points",
            "value": 0.058617793063042455,
            "range": "±1.39%",
            "unit": "ms",
            "extra": "17059.67 ops/sec (8534 samples)"
          },
          {
            "name": "benchmarks/layers.bench.ts > PointShaderLayer - onAdd with 10,000 points",
            "value": 0.7827197715179994,
            "range": "±5.11%",
            "unit": "ms",
            "extra": "1277.60 ops/sec (639 samples)"
          },
          {
            "name": "benchmarks/layers.bench.ts > PointShaderLayer - render cycle (1,000 points)",
            "value": 0.06014056110175656,
            "range": "±1.29%",
            "unit": "ms",
            "extra": "16627.71 ops/sec (8314 samples)"
          },
          {
            "name": "benchmarks/layers.bench.ts > PointShaderLayer - updateConfig (1,000 points)",
            "value": 0.12674127090725212,
            "range": "±1.00%",
            "unit": "ms",
            "extra": "7890.09 ops/sec (3946 samples)"
          },
          {
            "name": "benchmarks/layers.bench.ts > LineShaderLayer - create layer",
            "value": 0.000978081730421907,
            "range": "±0.55%",
            "unit": "ms",
            "extra": "1022409.45 ops/sec (511205 samples)"
          },
          {
            "name": "benchmarks/layers.bench.ts > LineShaderLayer - onAdd with 100 lines (10 pts each)",
            "value": 0.023111213549608357,
            "range": "±0.86%",
            "unit": "ms",
            "extra": "43269.04 ops/sec (21639 samples)"
          },
          {
            "name": "benchmarks/layers.bench.ts > LineShaderLayer - onAdd with 1,000 lines (10 pts each)",
            "value": 0.20966381006288903,
            "range": "±1.95%",
            "unit": "ms",
            "extra": "4769.54 ops/sec (2385 samples)"
          },
          {
            "name": "benchmarks/layers.bench.ts > LineShaderLayer - onAdd with 100 lines (100 pts each)",
            "value": 0.17909177041547292,
            "range": "±1.79%",
            "unit": "ms",
            "extra": "5583.73 ops/sec (2792 samples)"
          },
          {
            "name": "benchmarks/layers.bench.ts > LineShaderLayer - render cycle (1,000 lines)",
            "value": 0.20934060276265842,
            "range": "±2.00%",
            "unit": "ms",
            "extra": "4776.90 ops/sec (2389 samples)"
          },
          {
            "name": "benchmarks/layers.bench.ts > PolygonShaderLayer - create layer",
            "value": 0.000984631124151064,
            "range": "±0.36%",
            "unit": "ms",
            "extra": "1015608.77 ops/sec (507805 samples)"
          },
          {
            "name": "benchmarks/layers.bench.ts > PolygonShaderLayer - onAdd with 100 polygons (6 vertices)",
            "value": 0.026552094153255268,
            "range": "±0.67%",
            "unit": "ms",
            "extra": "37661.81 ops/sec (18831 samples)"
          },
          {
            "name": "benchmarks/layers.bench.ts > PolygonShaderLayer - onAdd with 1,000 polygons (6 vertices)",
            "value": 0.23087460987997957,
            "range": "±1.17%",
            "unit": "ms",
            "extra": "4331.36 ops/sec (2166 samples)"
          },
          {
            "name": "benchmarks/layers.bench.ts > PolygonShaderLayer - onAdd with 100 polygons (20 vertices)",
            "value": 0.06862602360367999,
            "range": "±1.02%",
            "unit": "ms",
            "extra": "14571.73 ops/sec (7287 samples)"
          },
          {
            "name": "benchmarks/layers.bench.ts > PolygonShaderLayer - render cycle (1,000 polygons)",
            "value": 0.2246957066487029,
            "range": "±1.24%",
            "unit": "ms",
            "extra": "4450.46 ops/sec (2226 samples)"
          },
          {
            "name": "benchmarks/layers.bench.ts > PolygonShaderLayer - triangulation (complex polygon 50 vertices)",
            "value": 0.16299248402868013,
            "range": "±1.41%",
            "unit": "ms",
            "extra": "6135.25 ops/sec (3068 samples)"
          },
          {
            "name": "benchmarks/layers.bench.ts > Layer Comparison - 1,000 points - full lifecycle",
            "value": 0.06094881155535194,
            "range": "±1.35%",
            "unit": "ms",
            "extra": "16407.21 ops/sec (8204 samples)"
          },
          {
            "name": "benchmarks/layers.bench.ts > Layer Comparison - 1,000 lines - full lifecycle",
            "value": 0.20645047770437894,
            "range": "±1.92%",
            "unit": "ms",
            "extra": "4843.78 ops/sec (2422 samples)"
          },
          {
            "name": "benchmarks/layers.bench.ts > Layer Comparison - 1,000 polygons - full lifecycle",
            "value": 0.2249594633378428,
            "range": "±1.19%",
            "unit": "ms",
            "extra": "4445.25 ops/sec (2223 samples)"
          }
        ]
      },
      {
        "commit": {
          "author": {
            "email": "julien.riel@gmail.com",
            "name": "Julien Riel",
            "username": "julien-riel"
          },
          "committer": {
            "email": "julien.riel@gmail.com",
            "name": "Julien Riel",
            "username": "julien-riel"
          },
          "distinct": true,
          "id": "5ad44d88a7933a7c7ff575091d062b3b717c8da9",
          "message": "fix: update e2e tests to use namespaced shader names and add visual regression baselines\n\n- Update shader names to use core: namespace prefix (e.g., 'pulse' → 'core:pulse')\n- Increase Playwright timeout and tolerance for WebGL content stability\n- Add animations: 'allow' to skip stability checks for WebGL screenshots\n- Exclude weather/depthFog shaders from visual regression (unstable particle effects)\n- Commit Linux/Chromium baseline snapshots for CI compatibility\n- Update .gitignore to track baseline snapshots while ignoring test failures\n\n🤖 Generated with [Claude Code](https://claude.com/claude-code)\n\nCo-Authored-By: Claude Opus 4.5 <noreply@anthropic.com>",
          "timestamp": "2026-01-02T23:12:54-05:00",
          "tree_id": "831dc7224961c0b8fccd7972ae18da32dc99db16",
          "url": "https://github.com/julien-riel/maplibre-animated-shaders/commit/5ad44d88a7933a7c7ff575091d062b3b717c8da9"
        },
        "date": 1767413735428,
        "tool": "customSmallerIsBetter",
        "benches": [
          {
            "name": "benchmarks/core.bench.ts > ObjectPool - acquire 1,000 points",
            "value": 0.014595175053993515,
            "range": "±0.94%",
            "unit": "ms",
            "extra": "68515.79 ops/sec (34258 samples)"
          },
          {
            "name": "benchmarks/core.bench.ts > ObjectPool - acquire 10,000 points",
            "value": 0.1350507169862638,
            "range": "±0.53%",
            "unit": "ms",
            "extra": "7404.63 ops/sec (3703 samples)"
          },
          {
            "name": "benchmarks/core.bench.ts > ObjectPool - acquire/release cycle 1,000 points",
            "value": 0.008152122835625102,
            "range": "±0.17%",
            "unit": "ms",
            "extra": "122667.44 ops/sec (61334 samples)"
          },
          {
            "name": "benchmarks/core.bench.ts > ObjectPool - acquire 1,000 segments",
            "value": 0.018375750238873202,
            "range": "±0.40%",
            "unit": "ms",
            "extra": "54419.55 ops/sec (27210 samples)"
          },
          {
            "name": "benchmarks/core.bench.ts > ObjectPool - acquire 1,000 polygons",
            "value": 0.058432567956027665,
            "range": "±0.46%",
            "unit": "ms",
            "extra": "17113.74 ops/sec (8557 samples)"
          },
          {
            "name": "benchmarks/core.bench.ts > AnimationLoop - create and destroy",
            "value": 0.0001584871161054811,
            "range": "±1.03%",
            "unit": "ms",
            "extra": "6309661.15 ops/sec (3154831 samples)"
          },
          {
            "name": "benchmarks/core.bench.ts > AnimationLoop - add/remove 100 shaders",
            "value": 0.011544230767462344,
            "range": "±1.20%",
            "unit": "ms",
            "extra": "86623.36 ops/sec (43312 samples)"
          },
          {
            "name": "benchmarks/core.bench.ts > AnimationLoop - tick with 50 shaders",
            "value": 0.0036149748404003933,
            "range": "±1.09%",
            "unit": "ms",
            "extra": "276627.10 ops/sec (138317 samples)"
          },
          {
            "name": "benchmarks/core.bench.ts > ShaderRegistry - register 100 shaders",
            "value": 0.01116029233069611,
            "range": "±1.60%",
            "unit": "ms",
            "extra": "89603.39 ops/sec (44802 samples)"
          },
          {
            "name": "benchmarks/core.bench.ts > ShaderRegistry - get shader by name (100 shaders)",
            "value": 0.011659862229795719,
            "range": "±1.36%",
            "unit": "ms",
            "extra": "85764.31 ops/sec (42883 samples)"
          },
          {
            "name": "benchmarks/core.bench.ts > ShaderRegistry - list shaders by geometry",
            "value": 0.02258447312558414,
            "range": "±1.04%",
            "unit": "ms",
            "extra": "44278.21 ops/sec (22140 samples)"
          },
          {
            "name": "benchmarks/core.bench.ts > ConfigResolver - resolve config (simple)",
            "value": 0.00009094656562066674,
            "range": "±1.08%",
            "unit": "ms",
            "extra": "10995467.43 ops/sec (5497734 samples)"
          },
          {
            "name": "benchmarks/core.bench.ts > ConfigResolver - resolve config (full override)",
            "value": 0.00018157174025238362,
            "range": "±0.26%",
            "unit": "ms",
            "extra": "5507464.98 ops/sec (2753733 samples)"
          },
          {
            "name": "benchmarks/core.bench.ts > ConfigResolver - validate config",
            "value": 0.0008320618022117748,
            "range": "±0.86%",
            "unit": "ms",
            "extra": "1201833.80 ops/sec (600917 samples)"
          },
          {
            "name": "benchmarks/core.bench.ts > ConfigResolver - resolve + validate 1,000 configs",
            "value": 1.2894313814432121,
            "range": "±1.09%",
            "unit": "ms",
            "extra": "775.54 ops/sec (388 samples)"
          },
          {
            "name": "benchmarks/data-processing.bench.ts > TimeOffsetCalculator - fixed offset (1,000 features)",
            "value": 0.06447570857511244,
            "range": "±2.25%",
            "unit": "ms",
            "extra": "15509.72 ops/sec (7755 samples)"
          },
          {
            "name": "benchmarks/data-processing.bench.ts > TimeOffsetCalculator - random offset (1,000 features)",
            "value": 0.061312374494168945,
            "range": "±1.03%",
            "unit": "ms",
            "extra": "16309.92 ops/sec (8155 samples)"
          },
          {
            "name": "benchmarks/data-processing.bench.ts > TimeOffsetCalculator - range offset (1,000 features)",
            "value": 0.06557895304918142,
            "range": "±0.99%",
            "unit": "ms",
            "extra": "15248.79 ops/sec (7625 samples)"
          },
          {
            "name": "benchmarks/data-processing.bench.ts > TimeOffsetCalculator - property-based offset (1,000 features)",
            "value": 0.06718392812034865,
            "range": "±0.97%",
            "unit": "ms",
            "extra": "14884.51 ops/sec (7443 samples)"
          },
          {
            "name": "benchmarks/data-processing.bench.ts > TimeOffsetCalculator - hash-based offset (1,000 features)",
            "value": 0.08731021564518608,
            "range": "±1.01%",
            "unit": "ms",
            "extra": "11453.41 ops/sec (5727 samples)"
          },
          {
            "name": "benchmarks/data-processing.bench.ts > TimeOffsetCalculator - fixed offset (10,000 features)",
            "value": 0.7671732009202691,
            "range": "±4.80%",
            "unit": "ms",
            "extra": "1303.49 ops/sec (652 samples)"
          },
          {
            "name": "benchmarks/data-processing.bench.ts > TimeOffsetCalculator - hash-based offset (10,000 features)",
            "value": 1.13522439229027,
            "range": "±4.24%",
            "unit": "ms",
            "extra": "880.88 ops/sec (441 samples)"
          },
          {
            "name": "benchmarks/data-processing.bench.ts > TimeOffsetCalculator - expanded offsets (1,000 features, 4 vertices)",
            "value": 0.0655836190975833,
            "range": "±1.25%",
            "unit": "ms",
            "extra": "15247.71 ops/sec (7624 samples)"
          },
          {
            "name": "benchmarks/data-processing.bench.ts > ExpressionEvaluator - compile simple get expression",
            "value": 0.0020220861163927966,
            "range": "±0.45%",
            "unit": "ms",
            "extra": "494538.78 ops/sec (247270 samples)"
          },
          {
            "name": "benchmarks/data-processing.bench.ts > ExpressionEvaluator - compile match expression",
            "value": 0.010717897644211142,
            "range": "±0.68%",
            "unit": "ms",
            "extra": "93301.88 ops/sec (46651 samples)"
          },
          {
            "name": "benchmarks/data-processing.bench.ts > ExpressionEvaluator - compile interpolate expression",
            "value": 0.008057192935512473,
            "range": "±0.69%",
            "unit": "ms",
            "extra": "124112.70 ops/sec (62057 samples)"
          },
          {
            "name": "benchmarks/data-processing.bench.ts > ExpressionEvaluator - evaluate get (1,000 features)",
            "value": 0.09824144990179597,
            "range": "±1.38%",
            "unit": "ms",
            "extra": "10179.00 ops/sec (5090 samples)"
          },
          {
            "name": "benchmarks/data-processing.bench.ts > ExpressionEvaluator - evaluate match (1,000 features)",
            "value": 0.11990557290168265,
            "range": "±1.33%",
            "unit": "ms",
            "extra": "8339.90 ops/sec (4170 samples)"
          },
          {
            "name": "benchmarks/data-processing.bench.ts > ExpressionEvaluator - evaluate complex (1,000 features)",
            "value": 0.16818885637408207,
            "range": "±1.27%",
            "unit": "ms",
            "extra": "5945.70 ops/sec (2973 samples)"
          },
          {
            "name": "benchmarks/data-processing.bench.ts > ExpressionEvaluator - multiple expressions (1,000 features)",
            "value": 0.2885611009809607,
            "range": "±1.28%",
            "unit": "ms",
            "extra": "3465.47 ops/sec (1733 samples)"
          },
          {
            "name": "benchmarks/data-processing.bench.ts > Color Conversion - hexToRgba (1,000 conversions)",
            "value": 0.16204429358394984,
            "range": "±0.65%",
            "unit": "ms",
            "extra": "6171.15 ops/sec (3086 samples)"
          },
          {
            "name": "benchmarks/data-processing.bench.ts > Color Conversion - rgbaToHex (1,000 conversions)",
            "value": 0.16577652204178578,
            "range": "±0.60%",
            "unit": "ms",
            "extra": "6032.22 ops/sec (3017 samples)"
          },
          {
            "name": "benchmarks/data-processing.bench.ts > Color Conversion - round-trip conversion (1,000 times)",
            "value": 0.3572534385714373,
            "range": "±0.61%",
            "unit": "ms",
            "extra": "2799.13 ops/sec (1400 samples)"
          },
          {
            "name": "benchmarks/data-processing.bench.ts > Coordinate Transformation - lngLat to Mercator (10,000 points)",
            "value": 0.14501854147332094,
            "range": "±0.68%",
            "unit": "ms",
            "extra": "6895.67 ops/sec (3448 samples)"
          },
          {
            "name": "benchmarks/data-processing.bench.ts > Coordinate Transformation - process coordinates array (1,000 lines x 10 pts)",
            "value": 0.813232136585471,
            "range": "±6.32%",
            "unit": "ms",
            "extra": "1229.66 ops/sec (615 samples)"
          },
          {
            "name": "benchmarks/data-processing.bench.ts > Buffer Building - Float32Array allocation (1,000 points, 24 bytes each)",
            "value": 0.03786560870881515,
            "range": "±4.73%",
            "unit": "ms",
            "extra": "26409.19 ops/sec (13205 samples)"
          },
          {
            "name": "benchmarks/data-processing.bench.ts > Buffer Building - Float32Array allocation (10,000 points)",
            "value": 0.2460377649950682,
            "range": "±5.75%",
            "unit": "ms",
            "extra": "4064.42 ops/sec (2034 samples)"
          },
          {
            "name": "benchmarks/data-processing.bench.ts > Buffer Building - Float32Array fill (1,000 points)",
            "value": 0.08012774122735691,
            "range": "±0.72%",
            "unit": "ms",
            "extra": "12480.07 ops/sec (6241 samples)"
          },
          {
            "name": "benchmarks/data-processing.bench.ts > Buffer Building - Uint16Array index buffer (1,000 quads)",
            "value": 0.006105043357743803,
            "range": "±2.53%",
            "unit": "ms",
            "extra": "163799.00 ops/sec (81900 samples)"
          },
          {
            "name": "benchmarks/layers.bench.ts > PointShaderLayer - create layer",
            "value": 0.0008534255924898498,
            "range": "±1.11%",
            "unit": "ms",
            "extra": "1171748.32 ops/sec (585875 samples)"
          },
          {
            "name": "benchmarks/layers.bench.ts > PointShaderLayer - onAdd with 100 points",
            "value": 0.010236546586139506,
            "range": "±0.94%",
            "unit": "ms",
            "extra": "97689.20 ops/sec (48845 samples)"
          },
          {
            "name": "benchmarks/layers.bench.ts > PointShaderLayer - onAdd with 1,000 points",
            "value": 0.06310823513820361,
            "range": "±1.58%",
            "unit": "ms",
            "extra": "15845.79 ops/sec (7923 samples)"
          },
          {
            "name": "benchmarks/layers.bench.ts > PointShaderLayer - onAdd with 10,000 points",
            "value": 0.8297525804311829,
            "range": "±5.40%",
            "unit": "ms",
            "extra": "1205.18 ops/sec (603 samples)"
          },
          {
            "name": "benchmarks/layers.bench.ts > PointShaderLayer - render cycle (1,000 points)",
            "value": 0.06272616219267828,
            "range": "±1.49%",
            "unit": "ms",
            "extra": "15942.31 ops/sec (7972 samples)"
          },
          {
            "name": "benchmarks/layers.bench.ts > PointShaderLayer - updateConfig (1,000 points)",
            "value": 0.1215681167031371,
            "range": "±1.17%",
            "unit": "ms",
            "extra": "8225.84 ops/sec (4113 samples)"
          },
          {
            "name": "benchmarks/layers.bench.ts > LineShaderLayer - create layer",
            "value": 0.0009034388453336089,
            "range": "±0.66%",
            "unit": "ms",
            "extra": "1106881.78 ops/sec (553441 samples)"
          },
          {
            "name": "benchmarks/layers.bench.ts > LineShaderLayer - onAdd with 100 lines (10 pts each)",
            "value": 0.023868113847918385,
            "range": "±0.94%",
            "unit": "ms",
            "extra": "41896.90 ops/sec (20949 samples)"
          },
          {
            "name": "benchmarks/layers.bench.ts > LineShaderLayer - onAdd with 1,000 lines (10 pts each)",
            "value": 0.22180050155074094,
            "range": "±2.20%",
            "unit": "ms",
            "extra": "4508.56 ops/sec (2257 samples)"
          },
          {
            "name": "benchmarks/layers.bench.ts > LineShaderLayer - onAdd with 100 lines (100 pts each)",
            "value": 0.18898951605592088,
            "range": "±2.04%",
            "unit": "ms",
            "extra": "5291.30 ops/sec (2647 samples)"
          },
          {
            "name": "benchmarks/layers.bench.ts > LineShaderLayer - render cycle (1,000 lines)",
            "value": 0.21480774957044216,
            "range": "±2.14%",
            "unit": "ms",
            "extra": "4655.33 ops/sec (2328 samples)"
          },
          {
            "name": "benchmarks/layers.bench.ts > PolygonShaderLayer - create layer",
            "value": 0.0008994113055852597,
            "range": "±0.24%",
            "unit": "ms",
            "extra": "1111838.37 ops/sec (555920 samples)"
          },
          {
            "name": "benchmarks/layers.bench.ts > PolygonShaderLayer - onAdd with 100 polygons (6 vertices)",
            "value": 0.026085284223713458,
            "range": "±0.91%",
            "unit": "ms",
            "extra": "38335.79 ops/sec (19168 samples)"
          },
          {
            "name": "benchmarks/layers.bench.ts > PolygonShaderLayer - onAdd with 1,000 polygons (6 vertices)",
            "value": 0.2505032985971781,
            "range": "±1.54%",
            "unit": "ms",
            "extra": "3991.96 ops/sec (1996 samples)"
          },
          {
            "name": "benchmarks/layers.bench.ts > PolygonShaderLayer - onAdd with 100 polygons (20 vertices)",
            "value": 0.07186297930440147,
            "range": "±1.49%",
            "unit": "ms",
            "extra": "13915.37 ops/sec (6958 samples)"
          },
          {
            "name": "benchmarks/layers.bench.ts > PolygonShaderLayer - render cycle (1,000 polygons)",
            "value": 0.23391362301217336,
            "range": "±1.65%",
            "unit": "ms",
            "extra": "4275.08 ops/sec (2138 samples)"
          },
          {
            "name": "benchmarks/layers.bench.ts > PolygonShaderLayer - triangulation (complex polygon 50 vertices)",
            "value": 0.175219085143673,
            "range": "±1.71%",
            "unit": "ms",
            "extra": "5707.14 ops/sec (2854 samples)"
          },
          {
            "name": "benchmarks/layers.bench.ts > Layer Comparison - 1,000 points - full lifecycle",
            "value": 0.06772439320060836,
            "range": "±1.66%",
            "unit": "ms",
            "extra": "14765.73 ops/sec (7383 samples)"
          },
          {
            "name": "benchmarks/layers.bench.ts > Layer Comparison - 1,000 lines - full lifecycle",
            "value": 0.2164032323669367,
            "range": "±2.23%",
            "unit": "ms",
            "extra": "4621.00 ops/sec (2311 samples)"
          },
          {
            "name": "benchmarks/layers.bench.ts > Layer Comparison - 1,000 polygons - full lifecycle",
            "value": 0.23165478508568163,
            "range": "±1.48%",
            "unit": "ms",
            "extra": "4316.77 ops/sec (2159 samples)"
          }
        ]
      },
      {
        "commit": {
          "author": {
            "email": "julien.riel@gmail.com",
            "name": "Julien Riel",
            "username": "julien-riel"
          },
          "committer": {
            "email": "julien.riel@gmail.com",
            "name": "Julien Riel",
            "username": "julien-riel"
          },
          "distinct": true,
          "id": "7156c8684584c2eb28097b252624371a2f5cd792",
          "message": "feat: enhance documentation and architecture for shader plugin system\n\n- Updated `.gitignore` to include Playwright videos and screenshots.\n- Revised `ARCHITECTURE.md` to introduce PluginManager and detailed plugin system architecture.\n- Expanded `README.md` to highlight plugin-based architecture, usage examples, and available shaders by plugin.\n- Added a demo GIF to showcase shader effects.\n- Introduced a script to create GIFs from PNG frames for easier demonstration.\n- Updated package dependencies for GIF encoding support.",
          "timestamp": "2026-01-02T23:48:38-05:00",
          "tree_id": "85bbe49e580c41645435b451a8541493360cf121",
          "url": "https://github.com/julien-riel/maplibre-animated-shaders/commit/7156c8684584c2eb28097b252624371a2f5cd792"
        },
        "date": 1767415795766,
        "tool": "customSmallerIsBetter",
        "benches": [
          {
            "name": "benchmarks/core.bench.ts > ObjectPool - acquire 1,000 points",
            "value": 0.013180620693297684,
            "range": "±0.92%",
            "unit": "ms",
            "extra": "75868.96 ops/sec (37935 samples)"
          },
          {
            "name": "benchmarks/core.bench.ts > ObjectPool - acquire 10,000 points",
            "value": 0.12951015928517398,
            "range": "±0.36%",
            "unit": "ms",
            "extra": "7721.40 ops/sec (3861 samples)"
          },
          {
            "name": "benchmarks/core.bench.ts > ObjectPool - acquire/release cycle 1,000 points",
            "value": 0.008181494927511216,
            "range": "±0.09%",
            "unit": "ms",
            "extra": "122227.05 ops/sec (61114 samples)"
          },
          {
            "name": "benchmarks/core.bench.ts > ObjectPool - acquire 1,000 segments",
            "value": 0.01796224007615716,
            "range": "±0.32%",
            "unit": "ms",
            "extra": "55672.34 ops/sec (27837 samples)"
          },
          {
            "name": "benchmarks/core.bench.ts > ObjectPool - acquire 1,000 polygons",
            "value": 0.06282461502702008,
            "range": "±0.55%",
            "unit": "ms",
            "extra": "15917.33 ops/sec (7959 samples)"
          },
          {
            "name": "benchmarks/core.bench.ts > AnimationLoop - create and destroy",
            "value": 0.0001425085613426849,
            "range": "±0.75%",
            "unit": "ms",
            "extra": "7017122.27 ops/sec (3508562 samples)"
          },
          {
            "name": "benchmarks/core.bench.ts > AnimationLoop - add/remove 100 shaders",
            "value": 0.011230854495633864,
            "range": "±0.58%",
            "unit": "ms",
            "extra": "89040.42 ops/sec (44521 samples)"
          },
          {
            "name": "benchmarks/core.bench.ts > AnimationLoop - tick with 50 shaders",
            "value": 0.0033919979037489393,
            "range": "±0.45%",
            "unit": "ms",
            "extra": "294811.50 ops/sec (147406 samples)"
          },
          {
            "name": "benchmarks/core.bench.ts > ShaderRegistry - register 100 shaders",
            "value": 0.010395878617775103,
            "range": "±0.93%",
            "unit": "ms",
            "extra": "96191.97 ops/sec (48096 samples)"
          },
          {
            "name": "benchmarks/core.bench.ts > ShaderRegistry - get shader by name (100 shaders)",
            "value": 0.011053695339796188,
            "range": "±0.81%",
            "unit": "ms",
            "extra": "90467.48 ops/sec (45234 samples)"
          },
          {
            "name": "benchmarks/core.bench.ts > ShaderRegistry - list shaders by geometry",
            "value": 0.02164067869659606,
            "range": "±0.74%",
            "unit": "ms",
            "extra": "46209.27 ops/sec (23109 samples)"
          },
          {
            "name": "benchmarks/core.bench.ts > ConfigResolver - resolve config (simple)",
            "value": 0.00009019189513911925,
            "range": "±0.81%",
            "unit": "ms",
            "extra": "11087470.76 ops/sec (5543736 samples)"
          },
          {
            "name": "benchmarks/core.bench.ts > ConfigResolver - resolve config (full override)",
            "value": 0.0001889089379608397,
            "range": "±0.55%",
            "unit": "ms",
            "extra": "5293555.78 ops/sec (2646778 samples)"
          },
          {
            "name": "benchmarks/core.bench.ts > ConfigResolver - validate config",
            "value": 0.0008015617642674515,
            "range": "±0.43%",
            "unit": "ms",
            "extra": "1247564.50 ops/sec (623783 samples)"
          },
          {
            "name": "benchmarks/core.bench.ts > ConfigResolver - resolve + validate 1,000 configs",
            "value": 1.250981322500138,
            "range": "±0.41%",
            "unit": "ms",
            "extra": "799.37 ops/sec (400 samples)"
          },
          {
            "name": "benchmarks/data-processing.bench.ts > TimeOffsetCalculator - fixed offset (1,000 features)",
            "value": 0.06233027998005363,
            "range": "±2.31%",
            "unit": "ms",
            "extra": "16043.57 ops/sec (8022 samples)"
          },
          {
            "name": "benchmarks/data-processing.bench.ts > TimeOffsetCalculator - random offset (1,000 features)",
            "value": 0.058869811278550295,
            "range": "±0.98%",
            "unit": "ms",
            "extra": "16986.64 ops/sec (8494 samples)"
          },
          {
            "name": "benchmarks/data-processing.bench.ts > TimeOffsetCalculator - range offset (1,000 features)",
            "value": 0.06775692452575076,
            "range": "±0.96%",
            "unit": "ms",
            "extra": "14758.64 ops/sec (7380 samples)"
          },
          {
            "name": "benchmarks/data-processing.bench.ts > TimeOffsetCalculator - property-based offset (1,000 features)",
            "value": 0.06525056283441696,
            "range": "±0.93%",
            "unit": "ms",
            "extra": "15325.54 ops/sec (7663 samples)"
          },
          {
            "name": "benchmarks/data-processing.bench.ts > TimeOffsetCalculator - hash-based offset (1,000 features)",
            "value": 0.0838492852112408,
            "range": "±0.94%",
            "unit": "ms",
            "extra": "11926.16 ops/sec (5964 samples)"
          },
          {
            "name": "benchmarks/data-processing.bench.ts > TimeOffsetCalculator - fixed offset (10,000 features)",
            "value": 0.7531180932330969,
            "range": "±4.56%",
            "unit": "ms",
            "extra": "1327.81 ops/sec (665 samples)"
          },
          {
            "name": "benchmarks/data-processing.bench.ts > TimeOffsetCalculator - hash-based offset (10,000 features)",
            "value": 1.090412344226704,
            "range": "±3.76%",
            "unit": "ms",
            "extra": "917.08 ops/sec (459 samples)"
          },
          {
            "name": "benchmarks/data-processing.bench.ts > TimeOffsetCalculator - expanded offsets (1,000 features, 4 vertices)",
            "value": 0.06382321633693555,
            "range": "±1.17%",
            "unit": "ms",
            "extra": "15668.28 ops/sec (7835 samples)"
          },
          {
            "name": "benchmarks/data-processing.bench.ts > ExpressionEvaluator - compile simple get expression",
            "value": 0.0021230863626170277,
            "range": "±0.37%",
            "unit": "ms",
            "extra": "471012.40 ops/sec (235507 samples)"
          },
          {
            "name": "benchmarks/data-processing.bench.ts > ExpressionEvaluator - compile match expression",
            "value": 0.010629226334481767,
            "range": "±0.41%",
            "unit": "ms",
            "extra": "94080.22 ops/sec (47041 samples)"
          },
          {
            "name": "benchmarks/data-processing.bench.ts > ExpressionEvaluator - compile interpolate expression",
            "value": 0.0076897512841716704,
            "range": "±0.43%",
            "unit": "ms",
            "extra": "130043.22 ops/sec (65022 samples)"
          },
          {
            "name": "benchmarks/data-processing.bench.ts > ExpressionEvaluator - evaluate get (1,000 features)",
            "value": 0.09308611373794246,
            "range": "±1.17%",
            "unit": "ms",
            "extra": "10742.74 ops/sec (5372 samples)"
          },
          {
            "name": "benchmarks/data-processing.bench.ts > ExpressionEvaluator - evaluate match (1,000 features)",
            "value": 0.11297505445096784,
            "range": "±1.30%",
            "unit": "ms",
            "extra": "8851.51 ops/sec (4426 samples)"
          },
          {
            "name": "benchmarks/data-processing.bench.ts > ExpressionEvaluator - evaluate complex (1,000 features)",
            "value": 0.15311290630738258,
            "range": "±1.11%",
            "unit": "ms",
            "extra": "6531.13 ops/sec (3266 samples)"
          },
          {
            "name": "benchmarks/data-processing.bench.ts > ExpressionEvaluator - multiple expressions (1,000 features)",
            "value": 0.26324988210519795,
            "range": "±1.16%",
            "unit": "ms",
            "extra": "3798.67 ops/sec (1900 samples)"
          },
          {
            "name": "benchmarks/data-processing.bench.ts > Color Conversion - hexToRgba (1,000 conversions)",
            "value": 0.17326081739432192,
            "range": "±0.86%",
            "unit": "ms",
            "extra": "5771.65 ops/sec (2886 samples)"
          },
          {
            "name": "benchmarks/data-processing.bench.ts > Color Conversion - rgbaToHex (1,000 conversions)",
            "value": 0.16217785992221453,
            "range": "±0.35%",
            "unit": "ms",
            "extra": "6166.07 ops/sec (3084 samples)"
          },
          {
            "name": "benchmarks/data-processing.bench.ts > Color Conversion - round-trip conversion (1,000 times)",
            "value": 0.3517095914205369,
            "range": "±0.52%",
            "unit": "ms",
            "extra": "2843.25 ops/sec (1422 samples)"
          },
          {
            "name": "benchmarks/data-processing.bench.ts > Coordinate Transformation - lngLat to Mercator (10,000 points)",
            "value": 0.14333910948697506,
            "range": "±0.39%",
            "unit": "ms",
            "extra": "6976.46 ops/sec (3489 samples)"
          },
          {
            "name": "benchmarks/data-processing.bench.ts > Coordinate Transformation - process coordinates array (1,000 lines x 10 pts)",
            "value": 0.305910844648324,
            "range": "±0.81%",
            "unit": "ms",
            "extra": "3268.93 ops/sec (1635 samples)"
          },
          {
            "name": "benchmarks/data-processing.bench.ts > Buffer Building - Float32Array allocation (1,000 points, 24 bytes each)",
            "value": 0.005548170572561645,
            "range": "±1.96%",
            "unit": "ms",
            "extra": "180239.59 ops/sec (90120 samples)"
          },
          {
            "name": "benchmarks/data-processing.bench.ts > Buffer Building - Float32Array allocation (10,000 points)",
            "value": 0.0345603594829857,
            "range": "±1.05%",
            "unit": "ms",
            "extra": "28934.88 ops/sec (14468 samples)"
          },
          {
            "name": "benchmarks/data-processing.bench.ts > Buffer Building - Float32Array fill (1,000 points)",
            "value": 0.07554032255626958,
            "range": "±0.41%",
            "unit": "ms",
            "extra": "13237.96 ops/sec (6619 samples)"
          },
          {
            "name": "benchmarks/data-processing.bench.ts > Buffer Building - Uint16Array index buffer (1,000 quads)",
            "value": 0.00430027243016869,
            "range": "±0.50%",
            "unit": "ms",
            "extra": "232543.41 ops/sec (116272 samples)"
          },
          {
            "name": "benchmarks/layers.bench.ts > PointShaderLayer - create layer",
            "value": 0.0008525865042433948,
            "range": "±0.81%",
            "unit": "ms",
            "extra": "1172901.51 ops/sec (586451 samples)"
          },
          {
            "name": "benchmarks/layers.bench.ts > PointShaderLayer - onAdd with 100 points",
            "value": 0.010464705504395202,
            "range": "±0.77%",
            "unit": "ms",
            "extra": "95559.31 ops/sec (47780 samples)"
          },
          {
            "name": "benchmarks/layers.bench.ts > PointShaderLayer - onAdd with 1,000 points",
            "value": 0.07443124873474147,
            "range": "±1.61%",
            "unit": "ms",
            "extra": "13435.22 ops/sec (6718 samples)"
          },
          {
            "name": "benchmarks/layers.bench.ts > PointShaderLayer - onAdd with 10,000 points",
            "value": 1.6439423540983715,
            "range": "±3.54%",
            "unit": "ms",
            "extra": "608.29 ops/sec (305 samples)"
          },
          {
            "name": "benchmarks/layers.bench.ts > PointShaderLayer - render cycle (1,000 points)",
            "value": 0.05899208647947219,
            "range": "±1.28%",
            "unit": "ms",
            "extra": "16951.43 ops/sec (8476 samples)"
          },
          {
            "name": "benchmarks/layers.bench.ts > PointShaderLayer - updateConfig (1,000 points)",
            "value": 0.12096073560716056,
            "range": "±0.97%",
            "unit": "ms",
            "extra": "8267.15 ops/sec (4134 samples)"
          },
          {
            "name": "benchmarks/layers.bench.ts > LineShaderLayer - create layer",
            "value": 0.0009618950093114861,
            "range": "±0.36%",
            "unit": "ms",
            "extra": "1039614.50 ops/sec (519808 samples)"
          },
          {
            "name": "benchmarks/layers.bench.ts > LineShaderLayer - onAdd with 100 lines (10 pts each)",
            "value": 0.025074756581913722,
            "range": "±1.73%",
            "unit": "ms",
            "extra": "39880.75 ops/sec (19941 samples)"
          },
          {
            "name": "benchmarks/layers.bench.ts > LineShaderLayer - onAdd with 1,000 lines (10 pts each)",
            "value": 0.5744878185993059,
            "range": "±1.33%",
            "unit": "ms",
            "extra": "1740.68 ops/sec (871 samples)"
          },
          {
            "name": "benchmarks/layers.bench.ts > LineShaderLayer - onAdd with 100 lines (100 pts each)",
            "value": 0.48192069460500847,
            "range": "±1.22%",
            "unit": "ms",
            "extra": "2075.03 ops/sec (1038 samples)"
          },
          {
            "name": "benchmarks/layers.bench.ts > LineShaderLayer - render cycle (1,000 lines)",
            "value": 0.20915540443329952,
            "range": "±1.95%",
            "unit": "ms",
            "extra": "4781.13 ops/sec (2391 samples)"
          },
          {
            "name": "benchmarks/layers.bench.ts > PolygonShaderLayer - create layer",
            "value": 0.0009449045514155398,
            "range": "±0.16%",
            "unit": "ms",
            "extra": "1058307.95 ops/sec (529154 samples)"
          },
          {
            "name": "benchmarks/layers.bench.ts > PolygonShaderLayer - onAdd with 100 polygons (6 vertices)",
            "value": 0.026628151081044635,
            "range": "±0.71%",
            "unit": "ms",
            "extra": "37554.24 ops/sec (18778 samples)"
          },
          {
            "name": "benchmarks/layers.bench.ts > PolygonShaderLayer - onAdd with 1,000 polygons (6 vertices)",
            "value": 0.4592611120294005,
            "range": "±0.87%",
            "unit": "ms",
            "extra": "2177.41 ops/sec (1089 samples)"
          },
          {
            "name": "benchmarks/layers.bench.ts > PolygonShaderLayer - onAdd with 100 polygons (20 vertices)",
            "value": 0.08258540495458831,
            "range": "±1.22%",
            "unit": "ms",
            "extra": "12108.68 ops/sec (6055 samples)"
          },
          {
            "name": "benchmarks/layers.bench.ts > PolygonShaderLayer - render cycle (1,000 polygons)",
            "value": 0.22158753699600675,
            "range": "±1.16%",
            "unit": "ms",
            "extra": "4512.89 ops/sec (2257 samples)"
          },
          {
            "name": "benchmarks/layers.bench.ts > PolygonShaderLayer - triangulation (complex polygon 50 vertices)",
            "value": 0.336930669137456,
            "range": "±0.98%",
            "unit": "ms",
            "extra": "2967.97 ops/sec (1484 samples)"
          },
          {
            "name": "benchmarks/layers.bench.ts > Layer Comparison - 1,000 points - full lifecycle",
            "value": 0.062121181885960906,
            "range": "±1.38%",
            "unit": "ms",
            "extra": "16097.57 ops/sec (8049 samples)"
          },
          {
            "name": "benchmarks/layers.bench.ts > Layer Comparison - 1,000 lines - full lifecycle",
            "value": 0.2664167906233244,
            "range": "±2.72%",
            "unit": "ms",
            "extra": "3753.52 ops/sec (1877 samples)"
          },
          {
            "name": "benchmarks/layers.bench.ts > Layer Comparison - 1,000 polygons - full lifecycle",
            "value": 0.30275282142856424,
            "range": "±2.49%",
            "unit": "ms",
            "extra": "3303.02 ops/sec (1652 samples)"
          }
        ]
      },
      {
        "commit": {
          "author": {
            "email": "julien.riel@gmail.com",
            "name": "Julien Riel",
            "username": "julien-riel"
          },
          "committer": {
            "email": "julien.riel@gmail.com",
            "name": "Julien Riel",
            "username": "julien-riel"
          },
          "distinct": true,
          "id": "22c70257a75918d94dc0523588821053fb6a1405",
          "message": "feat(shaders): introduce new sci-fi shaders including Holographic Grid, Neon, and Radar\n\n- Added Holographic Grid shader for a pulsing grid effect with customizable parameters.\n- Implemented Neon shader for a glowing neon effect with flicker and multiple layers.\n- Created Radar shader for a rotating sweep arc with optional grid lines and trail effects.\n- Updated shader index files to include new shaders and removed obsolete global shader exports.\n- Refactored shader imports in tests to align with the new plugin structure.",
          "timestamp": "2026-01-03T01:23:48-05:00",
          "tree_id": "20083eb1bd07079408b8c1021ee75c651726696f",
          "url": "https://github.com/julien-riel/maplibre-animated-shaders/commit/22c70257a75918d94dc0523588821053fb6a1405"
        },
        "date": 1767421495564,
        "tool": "customSmallerIsBetter",
        "benches": [
          {
            "name": "benchmarks/core.bench.ts > ObjectPool - acquire 1,000 points",
            "value": 0.012372648693469698,
            "range": "±0.62%",
            "unit": "ms",
            "extra": "80823.44 ops/sec (40412 samples)"
          },
          {
            "name": "benchmarks/core.bench.ts > ObjectPool - acquire 10,000 points",
            "value": 0.1297918948870942,
            "range": "±0.43%",
            "unit": "ms",
            "extra": "7704.64 ops/sec (3853 samples)"
          },
          {
            "name": "benchmarks/core.bench.ts > ObjectPool - acquire/release cycle 1,000 points",
            "value": 0.008368079245533608,
            "range": "±0.14%",
            "unit": "ms",
            "extra": "119501.74 ops/sec (59751 samples)"
          },
          {
            "name": "benchmarks/core.bench.ts > ObjectPool - acquire 1,000 segments",
            "value": 0.01940034295579417,
            "range": "±0.44%",
            "unit": "ms",
            "extra": "51545.48 ops/sec (25773 samples)"
          },
          {
            "name": "benchmarks/core.bench.ts > ObjectPool - acquire 1,000 polygons",
            "value": 0.05968990999164171,
            "range": "±0.26%",
            "unit": "ms",
            "extra": "16753.25 ops/sec (8377 samples)"
          },
          {
            "name": "benchmarks/core.bench.ts > AnimationLoop - create and destroy",
            "value": 0.00014424787927127508,
            "range": "±0.90%",
            "unit": "ms",
            "extra": "6932510.93 ops/sec (3466256 samples)"
          },
          {
            "name": "benchmarks/core.bench.ts > AnimationLoop - add/remove 100 shaders",
            "value": 0.010729676094409705,
            "range": "±1.34%",
            "unit": "ms",
            "extra": "93199.46 ops/sec (46600 samples)"
          },
          {
            "name": "benchmarks/core.bench.ts > AnimationLoop - tick with 50 shaders",
            "value": 0.003370833198499094,
            "range": "±0.46%",
            "unit": "ms",
            "extra": "296662.56 ops/sec (148332 samples)"
          },
          {
            "name": "benchmarks/core.bench.ts > ShaderRegistry - register 100 shaders",
            "value": 0.012468977281798533,
            "range": "±1.09%",
            "unit": "ms",
            "extra": "80199.04 ops/sec (40100 samples)"
          },
          {
            "name": "benchmarks/core.bench.ts > ShaderRegistry - get shader by name (100 shaders)",
            "value": 0.010909950512771086,
            "range": "±0.85%",
            "unit": "ms",
            "extra": "91659.44 ops/sec (45830 samples)"
          },
          {
            "name": "benchmarks/core.bench.ts > ShaderRegistry - list shaders by geometry",
            "value": 0.02169771489324191,
            "range": "±0.76%",
            "unit": "ms",
            "extra": "46087.80 ops/sec (23044 samples)"
          },
          {
            "name": "benchmarks/core.bench.ts > ConfigResolver - resolve config (simple)",
            "value": 0.00008758586252032398,
            "range": "±0.67%",
            "unit": "ms",
            "extra": "11417367.73 ops/sec (5708684 samples)"
          },
          {
            "name": "benchmarks/core.bench.ts > ConfigResolver - resolve config (full override)",
            "value": 0.00018437217772245554,
            "range": "±0.24%",
            "unit": "ms",
            "extra": "5423811.84 ops/sec (2711906 samples)"
          },
          {
            "name": "benchmarks/core.bench.ts > ConfigResolver - validate config",
            "value": 0.0008128219156230688,
            "range": "±0.66%",
            "unit": "ms",
            "extra": "1230281.79 ops/sec (615141 samples)"
          },
          {
            "name": "benchmarks/core.bench.ts > ConfigResolver - resolve + validate 1,000 configs",
            "value": 1.3011480441558865,
            "range": "±1.18%",
            "unit": "ms",
            "extra": "768.55 ops/sec (385 samples)"
          },
          {
            "name": "benchmarks/data-processing.bench.ts > TimeOffsetCalculator - fixed offset (1,000 features)",
            "value": 0.06320434104411898,
            "range": "±2.25%",
            "unit": "ms",
            "extra": "15821.70 ops/sec (7911 samples)"
          },
          {
            "name": "benchmarks/data-processing.bench.ts > TimeOffsetCalculator - random offset (1,000 features)",
            "value": 0.05902931601934829,
            "range": "±0.95%",
            "unit": "ms",
            "extra": "16940.74 ops/sec (8471 samples)"
          },
          {
            "name": "benchmarks/data-processing.bench.ts > TimeOffsetCalculator - range offset (1,000 features)",
            "value": 0.06375878707125329,
            "range": "±0.92%",
            "unit": "ms",
            "extra": "15684.11 ops/sec (7843 samples)"
          },
          {
            "name": "benchmarks/data-processing.bench.ts > TimeOffsetCalculator - property-based offset (1,000 features)",
            "value": 0.06552104415619656,
            "range": "±0.95%",
            "unit": "ms",
            "extra": "15262.27 ops/sec (7632 samples)"
          },
          {
            "name": "benchmarks/data-processing.bench.ts > TimeOffsetCalculator - hash-based offset (1,000 features)",
            "value": 0.0831432668772868,
            "range": "±0.85%",
            "unit": "ms",
            "extra": "12027.43 ops/sec (6014 samples)"
          },
          {
            "name": "benchmarks/data-processing.bench.ts > TimeOffsetCalculator - fixed offset (10,000 features)",
            "value": 0.7465114582089285,
            "range": "±4.65%",
            "unit": "ms",
            "extra": "1339.56 ops/sec (670 samples)"
          },
          {
            "name": "benchmarks/data-processing.bench.ts > TimeOffsetCalculator - hash-based offset (10,000 features)",
            "value": 1.0808273887687903,
            "range": "±3.76%",
            "unit": "ms",
            "extra": "925.22 ops/sec (463 samples)"
          },
          {
            "name": "benchmarks/data-processing.bench.ts > TimeOffsetCalculator - expanded offsets (1,000 features, 4 vertices)",
            "value": 0.06334352938942131,
            "range": "±1.19%",
            "unit": "ms",
            "extra": "15786.93 ops/sec (7894 samples)"
          },
          {
            "name": "benchmarks/data-processing.bench.ts > ExpressionEvaluator - compile simple get expression",
            "value": 0.0020221706260602178,
            "range": "±0.34%",
            "unit": "ms",
            "extra": "494518.11 ops/sec (247260 samples)"
          },
          {
            "name": "benchmarks/data-processing.bench.ts > ExpressionEvaluator - compile match expression",
            "value": 0.01027638918118903,
            "range": "±0.43%",
            "unit": "ms",
            "extra": "97310.44 ops/sec (48656 samples)"
          },
          {
            "name": "benchmarks/data-processing.bench.ts > ExpressionEvaluator - compile interpolate expression",
            "value": 0.007719954360183803,
            "range": "±0.44%",
            "unit": "ms",
            "extra": "129534.44 ops/sec (64768 samples)"
          },
          {
            "name": "benchmarks/data-processing.bench.ts > ExpressionEvaluator - evaluate get (1,000 features)",
            "value": 0.09884249021546634,
            "range": "±2.41%",
            "unit": "ms",
            "extra": "10117.11 ops/sec (5059 samples)"
          },
          {
            "name": "benchmarks/data-processing.bench.ts > ExpressionEvaluator - evaluate match (1,000 features)",
            "value": 0.11258090972534077,
            "range": "±1.29%",
            "unit": "ms",
            "extra": "8882.50 ops/sec (4442 samples)"
          },
          {
            "name": "benchmarks/data-processing.bench.ts > ExpressionEvaluator - evaluate complex (1,000 features)",
            "value": 0.15124242679974864,
            "range": "±1.00%",
            "unit": "ms",
            "extra": "6611.90 ops/sec (3306 samples)"
          },
          {
            "name": "benchmarks/data-processing.bench.ts > ExpressionEvaluator - multiple expressions (1,000 features)",
            "value": 0.27028473567569,
            "range": "±1.02%",
            "unit": "ms",
            "extra": "3699.80 ops/sec (1850 samples)"
          },
          {
            "name": "benchmarks/data-processing.bench.ts > Color Conversion - hexToRgba (1,000 conversions)",
            "value": 0.1608912409909789,
            "range": "±0.47%",
            "unit": "ms",
            "extra": "6215.38 ops/sec (3108 samples)"
          },
          {
            "name": "benchmarks/data-processing.bench.ts > Color Conversion - rgbaToHex (1,000 conversions)",
            "value": 0.17142761330132253,
            "range": "±0.34%",
            "unit": "ms",
            "extra": "5833.37 ops/sec (2917 samples)"
          },
          {
            "name": "benchmarks/data-processing.bench.ts > Color Conversion - round-trip conversion (1,000 times)",
            "value": 0.3603003090777692,
            "range": "±0.36%",
            "unit": "ms",
            "extra": "2775.46 ops/sec (1388 samples)"
          },
          {
            "name": "benchmarks/data-processing.bench.ts > Coordinate Transformation - lngLat to Mercator (10,000 points)",
            "value": 0.14307480829756786,
            "range": "±0.39%",
            "unit": "ms",
            "extra": "6989.35 ops/sec (3495 samples)"
          },
          {
            "name": "benchmarks/data-processing.bench.ts > Coordinate Transformation - process coordinates array (1,000 lines x 10 pts)",
            "value": 0.30840675400736334,
            "range": "±1.02%",
            "unit": "ms",
            "extra": "3242.47 ops/sec (1622 samples)"
          },
          {
            "name": "benchmarks/data-processing.bench.ts > Buffer Building - Float32Array allocation (1,000 points, 24 bytes each)",
            "value": 0.006270935697891304,
            "range": "±2.55%",
            "unit": "ms",
            "extra": "159465.84 ops/sec (79733 samples)"
          },
          {
            "name": "benchmarks/data-processing.bench.ts > Buffer Building - Float32Array allocation (10,000 points)",
            "value": 0.03582621329797212,
            "range": "±1.06%",
            "unit": "ms",
            "extra": "27912.52 ops/sec (13957 samples)"
          },
          {
            "name": "benchmarks/data-processing.bench.ts > Buffer Building - Float32Array fill (1,000 points)",
            "value": 0.07454822346454319,
            "range": "±0.37%",
            "unit": "ms",
            "extra": "13414.14 ops/sec (6708 samples)"
          },
          {
            "name": "benchmarks/data-processing.bench.ts > Buffer Building - Uint16Array index buffer (1,000 quads)",
            "value": 0.00378284656821649,
            "range": "±0.45%",
            "unit": "ms",
            "extra": "264351.19 ops/sec (132176 samples)"
          },
          {
            "name": "benchmarks/layers.bench.ts > PointShaderLayer - create layer",
            "value": 0.0008883356732064695,
            "range": "±0.57%",
            "unit": "ms",
            "extra": "1125700.60 ops/sec (562851 samples)"
          },
          {
            "name": "benchmarks/layers.bench.ts > PointShaderLayer - onAdd with 100 points",
            "value": 0.011543252747253374,
            "range": "±0.62%",
            "unit": "ms",
            "extra": "86630.69 ops/sec (43316 samples)"
          },
          {
            "name": "benchmarks/layers.bench.ts > PointShaderLayer - onAdd with 1,000 points",
            "value": 0.08080795927601538,
            "range": "±1.93%",
            "unit": "ms",
            "extra": "12375.02 ops/sec (6188 samples)"
          },
          {
            "name": "benchmarks/layers.bench.ts > PointShaderLayer - onAdd with 10,000 points",
            "value": 1.730988453287181,
            "range": "±3.59%",
            "unit": "ms",
            "extra": "577.70 ops/sec (289 samples)"
          },
          {
            "name": "benchmarks/layers.bench.ts > PointShaderLayer - render cycle (1,000 points)",
            "value": 0.060824529862545336,
            "range": "±1.31%",
            "unit": "ms",
            "extra": "16440.74 ops/sec (8221 samples)"
          },
          {
            "name": "benchmarks/layers.bench.ts > PointShaderLayer - updateConfig (1,000 points)",
            "value": 0.14161615171242808,
            "range": "±1.09%",
            "unit": "ms",
            "extra": "7061.34 ops/sec (3533 samples)"
          },
          {
            "name": "benchmarks/layers.bench.ts > LineShaderLayer - create layer",
            "value": 0.0010533243414624252,
            "range": "±0.41%",
            "unit": "ms",
            "extra": "949375.19 ops/sec (474688 samples)"
          },
          {
            "name": "benchmarks/layers.bench.ts > LineShaderLayer - onAdd with 100 lines (10 pts each)",
            "value": 0.02681398562771185,
            "range": "±0.97%",
            "unit": "ms",
            "extra": "37293.97 ops/sec (18647 samples)"
          },
          {
            "name": "benchmarks/layers.bench.ts > LineShaderLayer - onAdd with 1,000 lines (10 pts each)",
            "value": 0.7033489493670841,
            "range": "±1.16%",
            "unit": "ms",
            "extra": "1421.77 ops/sec (711 samples)"
          },
          {
            "name": "benchmarks/layers.bench.ts > LineShaderLayer - onAdd with 100 lines (100 pts each)",
            "value": 0.582563526193245,
            "range": "±1.16%",
            "unit": "ms",
            "extra": "1716.55 ops/sec (859 samples)"
          },
          {
            "name": "benchmarks/layers.bench.ts > LineShaderLayer - render cycle (1,000 lines)",
            "value": 0.20702335761588705,
            "range": "±1.91%",
            "unit": "ms",
            "extra": "4830.37 ops/sec (2416 samples)"
          },
          {
            "name": "benchmarks/layers.bench.ts > PolygonShaderLayer - create layer",
            "value": 0.0010148308926646716,
            "range": "±0.13%",
            "unit": "ms",
            "extra": "985385.85 ops/sec (492693 samples)"
          },
          {
            "name": "benchmarks/layers.bench.ts > PolygonShaderLayer - onAdd with 100 polygons (6 vertices)",
            "value": 0.06707448370221983,
            "range": "±0.53%",
            "unit": "ms",
            "extra": "14908.80 ops/sec (7455 samples)"
          },
          {
            "name": "benchmarks/layers.bench.ts > PolygonShaderLayer - onAdd with 1,000 polygons (6 vertices)",
            "value": 0.5629802553430799,
            "range": "±0.81%",
            "unit": "ms",
            "extra": "1776.26 ops/sec (889 samples)"
          },
          {
            "name": "benchmarks/layers.bench.ts > PolygonShaderLayer - onAdd with 100 polygons (20 vertices)",
            "value": 0.09250763034226336,
            "range": "±1.48%",
            "unit": "ms",
            "extra": "10809.92 ops/sec (5405 samples)"
          },
          {
            "name": "benchmarks/layers.bench.ts > PolygonShaderLayer - render cycle (1,000 polygons)",
            "value": 0.22467101527401262,
            "range": "±1.17%",
            "unit": "ms",
            "extra": "4450.95 ops/sec (2226 samples)"
          },
          {
            "name": "benchmarks/layers.bench.ts > PolygonShaderLayer - triangulation (complex polygon 50 vertices)",
            "value": 0.39246918288852445,
            "range": "±1.01%",
            "unit": "ms",
            "extra": "2547.97 ops/sec (1274 samples)"
          },
          {
            "name": "benchmarks/layers.bench.ts > Layer Comparison - 1,000 points - full lifecycle",
            "value": 0.06071755069825415,
            "range": "±1.36%",
            "unit": "ms",
            "extra": "16469.70 ops/sec (8235 samples)"
          },
          {
            "name": "benchmarks/layers.bench.ts > Layer Comparison - 1,000 lines - full lifecycle",
            "value": 0.2761860806184548,
            "range": "±2.80%",
            "unit": "ms",
            "extra": "3620.75 ops/sec (1811 samples)"
          },
          {
            "name": "benchmarks/layers.bench.ts > Layer Comparison - 1,000 polygons - full lifecycle",
            "value": 0.3035952046144589,
            "range": "±2.53%",
            "unit": "ms",
            "extra": "3293.86 ops/sec (1647 samples)"
          }
        ]
      },
      {
        "commit": {
          "author": {
            "email": "julien.riel@gmail.com",
            "name": "Julien Riel",
            "username": "julien-riel"
          },
          "committer": {
            "email": "noreply@github.com",
            "name": "GitHub",
            "username": "web-flow"
          },
          "distinct": true,
          "id": "55c40a1c8b570f6dd1a2af747df818421d542a52",
          "message": "Performance, qualité, mono-repo, docs (#15)\n\n* Refactor plugin system to introduce examplePlugin and remove thematic plugins\n\n- Updated index.ts to export only examplePlugin and its lazy loading functions.\n- Refactored loaders.ts to support loading of examplePlugin and removed unused thematic plugin loaders.\n- Modified tests to validate the structure and functionality of the new examplePlugin, ensuring it meets expected shader and preset criteria.\n- Adjusted shader tests to focus on the four shaders in the examplePlugin, verifying their structure and uniform handling.\n- Removed references to thematic plugins in various test files, consolidating tests around the new examplePlugin.\n\n* delete: remove RECOMMANDATIONS.md and ROADMAP.md files as part of project restructuring\n\n* delete: remove README.md as part of project restructuring\n\n* docs: add comprehensive project documentation\n\n- README.md: Project overview, installation, API reference, examples\n- ARCHITECTURE.md: Technical architecture, MapLibre integration, shader pipeline\n- PLUGIN_GUIDE.md: Step-by-step guide for creating custom shader plugins\n- RECOMMANDATIONS.md: Improvement recommendations for features, architecture, performance\n\n🤖 Generated with [Claude Code](https://claude.com/claude-code)\n\nCo-Authored-By: Claude Opus 4.5 <noreply@anthropic.com>\n\n* feat: add core infrastructure modules\n\n- Add src/constants.ts with centralized configuration constants\n- Add src/errors/ with typed error hierarchy and error codes\n- Add src/events/ with ShaderEventEmitter for lifecycle events\n- Add src/adapters/ with IMapAdapter interface and MapLibreAdapter\n- Add src/utils/program-cache.ts for WebGL shader program caching\n- Update src/index.ts with new exports\n- Update documentation (README.md, ARCHITECTURE.md)\n\n🤖 Generated with [Claude Code](https://claude.com/claude-code)\n\nCo-Authored-By: Claude Opus 4.5 <noreply@anthropic.com>\n\n* refactor: extract ShaderManager into modular core components\n\nSplit ShaderManager.ts (927 lines) into smaller, focused modules:\n\n- src/core/ShaderState.ts: Shared state management and factory\n- src/core/ShaderRegistration.ts: Shader register/unregister logic\n- src/core/ShaderPlayback.ts: Play/pause/speed/updateConfig control\n- src/core/index.ts: Module exports\n\nShaderManager.ts is now a lightweight facade (316 lines) that delegates\nto the core modules. Public API remains unchanged.\n\n🤖 Generated with [Claude Code](https://claude.com/claude-code)\n\nCo-Authored-By: Claude Opus 4.5 <noreply@anthropic.com>\n\n* docs: update ARCHITECTURE.md with core/ module structure\n\n- Add core/ directory to file structure\n- Add core modules to component responsibilities table\n- Update ShaderManager line count (927 → 316)\n\n🤖 Generated with [Claude Code](https://claude.com/claude-code)\n\nCo-Authored-By: Claude Opus 4.5 <noreply@anthropic.com>\n\n* Add comprehensive tests for deep-freeze utilities, InstancedRenderer, WebGLContext, and GeometryWorker\n\n- Implement tests for deep-freeze functions including deepFreeze, deepFreezeClone, createImmutableConfig, isFrozen, isDeeplyFrozen, mergeConfigs, and unfreeze.\n- Create tests for InstancedRenderer covering initialization, geometry setup, instance data management, drawing, and cleanup.\n- Add tests for WebGLContext to validate context wrapping, VAO management, and instanced drawing capabilities.\n- Introduce tests for GeometryWorker to ensure proper geometry processing, simplification, bounds computation, and buffer generation.\n- Mock necessary WebGL and Worker functionalities to isolate tests and ensure reliability.\n\n* feat: update dependencies and add size-limit for bundle size checks\n\n- Added @size-limit/preset-small-lib and size-limit to devDependencies.\n- Introduced size and size:check scripts for size-limit integration.\n- Updated package-lock.json with new dependencies and their versions.\n- Modified generate-changelog script to use ES module syntax.\n- Updated project name in documentation and comments for clarity.\n- Enhanced color utility functions with detailed JSDoc comments.\n- Refactored ProgramBuilder to use const for isFirstBlock.\n- Updated TypeDoc configuration for new project name and GitHub link.\n\n* feat: implement Phase 2 robustness improvements\n\n- Add WebGL context recovery tests (17 tests)\n- Add MapLibre multi-version compatibility CI workflow\n- Add framework integration examples (React, Vue, Vanilla JS)\n- Add production performance monitoring utility with telemetry support\n\n🤖 Generated with [Claude Code](https://claude.com/claude-code)\n\nCo-Authored-By: Claude Opus 4.5 <noreply@anthropic.com>\n\n* feat: implement Phase 3 - React/Vue wrappers and visual shader editor\n\nReact package (packages/react/):\n- Hooks: useShaderEffect, useShaderManager, useShaderRegistry, usePerformanceMonitor\n- Components: ShaderLayer, AnimatedMap, ShaderProvider\n- Full TypeScript support with comprehensive types\n\nVue package (packages/vue/):\n- Composables: useShaderEffect, useShaderManager, useShaderRegistry, usePerformanceMonitor\n- Components: ShaderLayer.vue, AnimatedMap.vue\n- Vue 3 Composition API with TypeScript\n\nVisual Shader Editor (demo):\n- GLSL syntax editing for vertex and fragment shaders\n- Automatic uniform controls generation\n- Basic GLSL validation\n- Export/Import functionality (JSON)\n- Keyboard shortcut (Ctrl+Enter) to compile\n- Integration with ConfigPanel and MapView\n\n🤖 Generated with [Claude Code](https://claude.com/claude-code)\n\nCo-Authored-By: Claude Opus 4.5 <noreply@anthropic.com>\n\n* refactor: move demo to packages/demo for monorepo structure\n\n- Move demo/ to packages/demo/\n- Update import paths from ../../src to ../../../src and ../../../../src\n- Update vite.config.ts paths for generated-docs and dist output\n- Update package.json scripts to use packages/demo/\n- Fix CI workflow artifact path to dist-demo/\n\n🤖 Generated with [Claude Code](https://claude.com/claude-code)\n\nCo-Authored-By: Claude Opus 4.5 <noreply@anthropic.com>\n\n* chore: configure npm workspaces for monorepo\n\n- Add workspaces configuration to root package.json\n- Create packages/demo/package.json with workspace dependency\n- Update demo imports to use package name instead of relative paths\n- Configure Vite aliases to resolve workspace package to source\n- Update package-lock.json with workspace dependencies\n\nStructure:\n- packages/demo - Interactive playground (private)\n- packages/react - React bindings\n- packages/vue - Vue 3 bindings\n\n🤖 Generated with [Claude Code](https://claude.com/claude-code)\n\nCo-Authored-By: Claude Opus 4.5 <noreply@anthropic.com>\n\n* refactor: move core library to packages/lib for full monorepo structure\n\n- Move src/ to packages/lib/src/\n- Create packages/lib/package.json with library config\n- Create packages/lib/vite.config.ts and tsconfig.json\n- Update root package.json as workspace root (private)\n- Update demo vite.config to resolve from ../lib/src\n- Update vitest.config.ts paths for packages/lib\n- Update scripts/validate-glsl.ts for new path\n- Update typedoc.json entry point\n- Update .size-limit.json bundle paths\n- Update CI workflows for packages/lib/dist\n- Update e2e vite config\n- Create packages/demo/tsconfig.json\n- Remove root vite.config.ts (now in packages/lib)\n\nFinal monorepo structure:\n- packages/lib - Core shader library (maplibre-animated-shaders)\n- packages/demo - Interactive playground\n- packages/react - React bindings\n- packages/vue - Vue 3 bindings\n\n🤖 Generated with [Claude Code](https://claude.com/claude-code)\n\nCo-Authored-By: Claude Opus 4.5 <noreply@anthropic.com>\n\n* refactor: move tests and benchmarks to packages/lib\n\n- Move tests/ to packages/lib/tests/\n- Move benchmarks/ to packages/lib/benchmarks/\n- Update vitest.config.ts paths\n\nAll 924 tests pass.\n\n🤖 Generated with [Claude Code](https://claude.com/claude-code)\n\nCo-Authored-By: Claude Opus 4.5 <noreply@anthropic.com>\n\n* feat: add performance monitoring utility and tests\n\n- Introduced ProductionPerformanceMonitor for tracking FPS, frame times, and GPU metrics.\n- Implemented telemetry reporting capabilities with customizable options.\n- Added event handling for performance-related events such as FPS warnings and context loss.\n- Created tests for the performance monitor covering initialization, metrics collection, event handling, telemetry, and context recovery.\n- Developed tests for WebGL context loss and recovery, ensuring graceful degradation and resource management.\n\n* feat: add initial README, LICENSE, and CHANGELOG files for the library\n\n* refactor: update shader tests to use example namespace and remove visual regression tests\n\n* fix: update test import compatibility path in workflow\n\n* feat: add MapLibre 5.x compatibility\n\nAdd support for the new render() method signature introduced in MapLibre 5.0\nwhile maintaining backward compatibility with 3.x and 4.x versions.\n\nChanges:\n- Add CustomRenderMethodInput type and extractMatrix() helper function\n- Update BaseShaderLayer and GlobalShaderLayer render methods\n- Use type casting when adding layers to the map\n- Fix CI workflow to run test script from project directory\n- Add maintenance documentation for MapLibre compatibility\n\n🤖 Generated with [Claude Code](https://claude.com/claude-code)\n\nCo-Authored-By: Claude Opus 4.5 <noreply@anthropic.com>\n\n---------\n\nCo-authored-by: Claude Opus 4.5 <noreply@anthropic.com>",
          "timestamp": "2026-01-05T21:00:30-05:00",
          "tree_id": "622181211a76e5b157c9e6d2931c84c8efcc7c5c",
          "url": "https://github.com/julien-riel/maplibre-animated-shaders/commit/55c40a1c8b570f6dd1a2af747df818421d542a52"
        },
        "date": 1767664894526,
        "tool": "customSmallerIsBetter",
        "benches": [
          {
            "name": "packages/lib/benchmarks/core.bench.ts > ObjectPool - acquire 1,000 points",
            "value": 0.013022710561274105,
            "range": "±0.72%",
            "unit": "ms",
            "extra": "76788.93 ops/sec (38395 samples)"
          },
          {
            "name": "packages/lib/benchmarks/core.bench.ts > ObjectPool - acquire 10,000 points",
            "value": 0.13341358244394572,
            "range": "±0.39%",
            "unit": "ms",
            "extra": "7495.49 ops/sec (3748 samples)"
          },
          {
            "name": "packages/lib/benchmarks/core.bench.ts > ObjectPool - acquire/release cycle 1,000 points",
            "value": 0.008145573960650647,
            "range": "±0.18%",
            "unit": "ms",
            "extra": "122766.06 ops/sec (61384 samples)"
          },
          {
            "name": "packages/lib/benchmarks/core.bench.ts > ObjectPool - acquire 1,000 segments",
            "value": 0.018293819588757542,
            "range": "±0.34%",
            "unit": "ms",
            "extra": "54663.27 ops/sec (27332 samples)"
          },
          {
            "name": "packages/lib/benchmarks/core.bench.ts > ObjectPool - acquire 1,000 polygons",
            "value": 0.0648736922678137,
            "range": "±0.62%",
            "unit": "ms",
            "extra": "15414.57 ops/sec (7708 samples)"
          },
          {
            "name": "packages/lib/benchmarks/core.bench.ts > AnimationLoop - create and destroy",
            "value": 0.00014493704457130586,
            "range": "±0.84%",
            "unit": "ms",
            "extra": "6899547.34 ops/sec (3449774 samples)"
          },
          {
            "name": "packages/lib/benchmarks/core.bench.ts > AnimationLoop - add/remove 100 shaders",
            "value": 0.011018850739365713,
            "range": "±0.60%",
            "unit": "ms",
            "extra": "90753.57 ops/sec (45377 samples)"
          },
          {
            "name": "packages/lib/benchmarks/core.bench.ts > AnimationLoop - tick with 50 shaders",
            "value": 0.0035811612949457087,
            "range": "±0.57%",
            "unit": "ms",
            "extra": "279239.03 ops/sec (139620 samples)"
          },
          {
            "name": "packages/lib/benchmarks/core.bench.ts > ShaderRegistry - register 100 shaders",
            "value": 0.010562082488370246,
            "range": "±0.95%",
            "unit": "ms",
            "extra": "94678.30 ops/sec (47340 samples)"
          },
          {
            "name": "packages/lib/benchmarks/core.bench.ts > ShaderRegistry - get shader by name (100 shaders)",
            "value": 0.011242441686369162,
            "range": "±0.82%",
            "unit": "ms",
            "extra": "88948.65 ops/sec (44475 samples)"
          },
          {
            "name": "packages/lib/benchmarks/core.bench.ts > ShaderRegistry - list shaders by geometry",
            "value": 0.021612546747354914,
            "range": "±0.75%",
            "unit": "ms",
            "extra": "46269.42 ops/sec (23135 samples)"
          },
          {
            "name": "packages/lib/benchmarks/core.bench.ts > ConfigResolver - resolve config (simple)",
            "value": 0.00009058138882493447,
            "range": "±0.90%",
            "unit": "ms",
            "extra": "11039795.40 ops/sec (5519898 samples)"
          },
          {
            "name": "packages/lib/benchmarks/core.bench.ts > ConfigResolver - resolve config (full override)",
            "value": 0.00018413930872505487,
            "range": "±0.23%",
            "unit": "ms",
            "extra": "5430670.98 ops/sec (2715336 samples)"
          },
          {
            "name": "packages/lib/benchmarks/core.bench.ts > ConfigResolver - validate config",
            "value": 0.0007934638045874403,
            "range": "±0.42%",
            "unit": "ms",
            "extra": "1260296.93 ops/sec (630149 samples)"
          },
          {
            "name": "packages/lib/benchmarks/core.bench.ts > ConfigResolver - resolve + validate 1,000 configs",
            "value": 1.2342342290638564,
            "range": "±0.37%",
            "unit": "ms",
            "extra": "810.22 ops/sec (406 samples)"
          },
          {
            "name": "packages/lib/benchmarks/data-processing.bench.ts > TimeOffsetCalculator - fixed offset (1,000 features)",
            "value": 0.06433429255113451,
            "range": "±2.10%",
            "unit": "ms",
            "extra": "15543.81 ops/sec (7773 samples)"
          },
          {
            "name": "packages/lib/benchmarks/data-processing.bench.ts > TimeOffsetCalculator - random offset (1,000 features)",
            "value": 0.06063723999514504,
            "range": "±0.97%",
            "unit": "ms",
            "extra": "16491.52 ops/sec (8246 samples)"
          },
          {
            "name": "packages/lib/benchmarks/data-processing.bench.ts > TimeOffsetCalculator - range offset (1,000 features)",
            "value": 0.06834663395297426,
            "range": "±0.99%",
            "unit": "ms",
            "extra": "14631.30 ops/sec (7316 samples)"
          },
          {
            "name": "packages/lib/benchmarks/data-processing.bench.ts > TimeOffsetCalculator - property-based offset (1,000 features)",
            "value": 0.06596061799234428,
            "range": "±0.95%",
            "unit": "ms",
            "extra": "15160.56 ops/sec (7581 samples)"
          },
          {
            "name": "packages/lib/benchmarks/data-processing.bench.ts > TimeOffsetCalculator - hash-based offset (1,000 features)",
            "value": 0.08410818502944885,
            "range": "±0.85%",
            "unit": "ms",
            "extra": "11889.45 ops/sec (5945 samples)"
          },
          {
            "name": "packages/lib/benchmarks/data-processing.bench.ts > TimeOffsetCalculator - fixed offset (10,000 features)",
            "value": 0.7625357728658755,
            "range": "±4.72%",
            "unit": "ms",
            "extra": "1311.41 ops/sec (656 samples)"
          },
          {
            "name": "packages/lib/benchmarks/data-processing.bench.ts > TimeOffsetCalculator - hash-based offset (10,000 features)",
            "value": 1.112485386666732,
            "range": "±3.98%",
            "unit": "ms",
            "extra": "898.89 ops/sec (450 samples)"
          },
          {
            "name": "packages/lib/benchmarks/data-processing.bench.ts > TimeOffsetCalculator - expanded offsets (1,000 features, 4 vertices)",
            "value": 0.06673009195245905,
            "range": "±1.30%",
            "unit": "ms",
            "extra": "14985.74 ops/sec (7493 samples)"
          },
          {
            "name": "packages/lib/benchmarks/data-processing.bench.ts > ExpressionEvaluator - compile simple get expression",
            "value": 0.002065516046945128,
            "range": "±0.57%",
            "unit": "ms",
            "extra": "484140.51 ops/sec (242071 samples)"
          },
          {
            "name": "packages/lib/benchmarks/data-processing.bench.ts > ExpressionEvaluator - compile match expression",
            "value": 0.01055029257485613,
            "range": "±0.56%",
            "unit": "ms",
            "extra": "94784.10 ops/sec (47393 samples)"
          },
          {
            "name": "packages/lib/benchmarks/data-processing.bench.ts > ExpressionEvaluator - compile interpolate expression",
            "value": 0.007849110781448695,
            "range": "±0.71%",
            "unit": "ms",
            "extra": "127402.97 ops/sec (63702 samples)"
          },
          {
            "name": "packages/lib/benchmarks/data-processing.bench.ts > ExpressionEvaluator - evaluate get (1,000 features)",
            "value": 0.09574538579361727,
            "range": "±1.27%",
            "unit": "ms",
            "extra": "10444.37 ops/sec (5223 samples)"
          },
          {
            "name": "packages/lib/benchmarks/data-processing.bench.ts > ExpressionEvaluator - evaluate match (1,000 features)",
            "value": 0.11604005314460619,
            "range": "±1.41%",
            "unit": "ms",
            "extra": "8617.71 ops/sec (4309 samples)"
          },
          {
            "name": "packages/lib/benchmarks/data-processing.bench.ts > ExpressionEvaluator - evaluate complex (1,000 features)",
            "value": 0.15695163559316713,
            "range": "±1.22%",
            "unit": "ms",
            "extra": "6371.39 ops/sec (3186 samples)"
          },
          {
            "name": "packages/lib/benchmarks/data-processing.bench.ts > ExpressionEvaluator - multiple expressions (1,000 features)",
            "value": 0.28331905892344716,
            "range": "±1.67%",
            "unit": "ms",
            "extra": "3529.59 ops/sec (1765 samples)"
          },
          {
            "name": "packages/lib/benchmarks/data-processing.bench.ts > Color Conversion - hexToRgba (1,000 conversions)",
            "value": 0.17553647420153215,
            "range": "±1.84%",
            "unit": "ms",
            "extra": "5696.82 ops/sec (2849 samples)"
          },
          {
            "name": "packages/lib/benchmarks/data-processing.bench.ts > Color Conversion - rgbaToHex (1,000 conversions)",
            "value": 0.16420616289001186,
            "range": "±0.39%",
            "unit": "ms",
            "extra": "6089.91 ops/sec (3045 samples)"
          },
          {
            "name": "packages/lib/benchmarks/data-processing.bench.ts > Color Conversion - round-trip conversion (1,000 times)",
            "value": 0.3571961814286442,
            "range": "±0.45%",
            "unit": "ms",
            "extra": "2799.58 ops/sec (1400 samples)"
          },
          {
            "name": "packages/lib/benchmarks/data-processing.bench.ts > Coordinate Transformation - lngLat to Mercator (10,000 points)",
            "value": 0.146268352046784,
            "range": "±0.62%",
            "unit": "ms",
            "extra": "6836.75 ops/sec (3420 samples)"
          },
          {
            "name": "packages/lib/benchmarks/data-processing.bench.ts > Coordinate Transformation - process coordinates array (1,000 lines x 10 pts)",
            "value": 0.3062919522351417,
            "range": "±0.92%",
            "unit": "ms",
            "extra": "3264.86 ops/sec (1633 samples)"
          },
          {
            "name": "packages/lib/benchmarks/data-processing.bench.ts > Buffer Building - Float32Array allocation (1,000 points, 24 bytes each)",
            "value": 0.010180978753708932,
            "range": "±3.57%",
            "unit": "ms",
            "extra": "98222.38 ops/sec (49138 samples)"
          },
          {
            "name": "packages/lib/benchmarks/data-processing.bench.ts > Buffer Building - Float32Array allocation (10,000 points)",
            "value": 0.14447101906959112,
            "range": "±5.24%",
            "unit": "ms",
            "extra": "6921.80 ops/sec (3461 samples)"
          },
          {
            "name": "packages/lib/benchmarks/data-processing.bench.ts > Buffer Building - Float32Array fill (1,000 points)",
            "value": 0.07720868035821757,
            "range": "±1.35%",
            "unit": "ms",
            "extra": "12951.91 ops/sec (6476 samples)"
          },
          {
            "name": "packages/lib/benchmarks/data-processing.bench.ts > Buffer Building - Uint16Array index buffer (1,000 quads)",
            "value": 0.004672831124644593,
            "range": "±2.52%",
            "unit": "ms",
            "extra": "214003.03 ops/sec (107002 samples)"
          },
          {
            "name": "packages/lib/benchmarks/layers.bench.ts > PointShaderLayer - create layer",
            "value": 0.0008034013085799558,
            "range": "±0.65%",
            "unit": "ms",
            "extra": "1244707.96 ops/sec (622354 samples)"
          },
          {
            "name": "packages/lib/benchmarks/layers.bench.ts > PointShaderLayer - onAdd with 100 points",
            "value": 0.010055078910853065,
            "range": "±0.74%",
            "unit": "ms",
            "extra": "99452.23 ops/sec (49727 samples)"
          },
          {
            "name": "packages/lib/benchmarks/layers.bench.ts > PointShaderLayer - onAdd with 1,000 points",
            "value": 0.06413663904566376,
            "range": "±1.53%",
            "unit": "ms",
            "extra": "15591.71 ops/sec (7796 samples)"
          },
          {
            "name": "packages/lib/benchmarks/layers.bench.ts > PointShaderLayer - onAdd with 10,000 points",
            "value": 0.8249956365131614,
            "range": "±5.26%",
            "unit": "ms",
            "extra": "1212.13 ops/sec (608 samples)"
          },
          {
            "name": "packages/lib/benchmarks/layers.bench.ts > PointShaderLayer - render cycle (1,000 points)",
            "value": 0.06403101498079268,
            "range": "±1.48%",
            "unit": "ms",
            "extra": "15617.43 ops/sec (7810 samples)"
          },
          {
            "name": "packages/lib/benchmarks/layers.bench.ts > PointShaderLayer - updateConfig (1,000 points)",
            "value": 0.12420585196224598,
            "range": "±1.07%",
            "unit": "ms",
            "extra": "8051.15 ops/sec (4026 samples)"
          },
          {
            "name": "packages/lib/benchmarks/layers.bench.ts > LineShaderLayer - create layer",
            "value": 0.0009070764846100023,
            "range": "±0.48%",
            "unit": "ms",
            "extra": "1102442.87 ops/sec (551222 samples)"
          },
          {
            "name": "packages/lib/benchmarks/layers.bench.ts > LineShaderLayer - onAdd with 100 lines (10 pts each)",
            "value": 0.024219870477118936,
            "range": "±0.97%",
            "unit": "ms",
            "extra": "41288.41 ops/sec (20645 samples)"
          },
          {
            "name": "packages/lib/benchmarks/layers.bench.ts > LineShaderLayer - onAdd with 1,000 lines (10 pts each)",
            "value": 0.20868675083472693,
            "range": "±1.94%",
            "unit": "ms",
            "extra": "4791.87 ops/sec (2396 samples)"
          },
          {
            "name": "packages/lib/benchmarks/layers.bench.ts > LineShaderLayer - onAdd with 100 lines (100 pts each)",
            "value": 0.18252700693431367,
            "range": "±1.94%",
            "unit": "ms",
            "extra": "5478.64 ops/sec (2740 samples)"
          },
          {
            "name": "packages/lib/benchmarks/layers.bench.ts > LineShaderLayer - render cycle (1,000 lines)",
            "value": 0.20705164430643097,
            "range": "±1.98%",
            "unit": "ms",
            "extra": "4829.71 ops/sec (2415 samples)"
          },
          {
            "name": "packages/lib/benchmarks/layers.bench.ts > PolygonShaderLayer - create layer",
            "value": 0.0009262217836072183,
            "range": "±0.23%",
            "unit": "ms",
            "extra": "1079655.02 ops/sec (539828 samples)"
          },
          {
            "name": "packages/lib/benchmarks/layers.bench.ts > PolygonShaderLayer - onAdd with 100 polygons (6 vertices)",
            "value": 0.02598534642969431,
            "range": "±0.66%",
            "unit": "ms",
            "extra": "38483.23 ops/sec (19242 samples)"
          },
          {
            "name": "packages/lib/benchmarks/layers.bench.ts > PolygonShaderLayer - onAdd with 1,000 polygons (6 vertices)",
            "value": 0.24690225913128763,
            "range": "±1.41%",
            "unit": "ms",
            "extra": "4050.19 ops/sec (2026 samples)"
          },
          {
            "name": "packages/lib/benchmarks/layers.bench.ts > PolygonShaderLayer - onAdd with 100 polygons (20 vertices)",
            "value": 0.07067943321554655,
            "range": "±1.03%",
            "unit": "ms",
            "extra": "14148.39 ops/sec (7075 samples)"
          },
          {
            "name": "packages/lib/benchmarks/layers.bench.ts > PolygonShaderLayer - render cycle (1,000 polygons)",
            "value": 0.2446683442542938,
            "range": "±1.50%",
            "unit": "ms",
            "extra": "4087.17 ops/sec (2045 samples)"
          },
          {
            "name": "packages/lib/benchmarks/layers.bench.ts > PolygonShaderLayer - triangulation (complex polygon 50 vertices)",
            "value": 0.17950414644653118,
            "range": "±1.82%",
            "unit": "ms",
            "extra": "5570.90 ops/sec (2786 samples)"
          },
          {
            "name": "packages/lib/benchmarks/layers.bench.ts > Layer Comparison - 1,000 points - full lifecycle",
            "value": 0.06521268792383397,
            "range": "±1.52%",
            "unit": "ms",
            "extra": "15334.44 ops/sec (7668 samples)"
          },
          {
            "name": "packages/lib/benchmarks/layers.bench.ts > Layer Comparison - 1,000 lines - full lifecycle",
            "value": 0.21196123993216998,
            "range": "±2.02%",
            "unit": "ms",
            "extra": "4717.84 ops/sec (2359 samples)"
          },
          {
            "name": "packages/lib/benchmarks/layers.bench.ts > Layer Comparison - 1,000 polygons - full lifecycle",
            "value": 0.2287110585276753,
            "range": "±1.23%",
            "unit": "ms",
            "extra": "4372.33 ops/sec (2187 samples)"
          }
        ]
      },
      {
        "commit": {
          "author": {
            "email": "julien.riel@gmail.com",
            "name": "Julien Riel",
            "username": "julien-riel"
          },
          "committer": {
            "email": "julien.riel@gmail.com",
            "name": "Julien Riel",
            "username": "julien-riel"
          },
          "distinct": true,
          "id": "8efae1377cd7b75d4f851dbb8662e0d521de9d51",
          "message": "chore: bump version to 0.2.0 for maplibre-animated-shaders",
          "timestamp": "2026-01-05T21:07:57-05:00",
          "tree_id": "523f73ab6598b24abb821e7abc81b7cda27059e7",
          "url": "https://github.com/julien-riel/maplibre-animated-shaders/commit/8efae1377cd7b75d4f851dbb8662e0d521de9d51"
        },
        "date": 1767665343777,
        "tool": "customSmallerIsBetter",
        "benches": [
          {
            "name": "packages/lib/benchmarks/core.bench.ts > ObjectPool - acquire 1,000 points",
            "value": 0.01241776354154646,
            "range": "±0.53%",
            "unit": "ms",
            "extra": "80529.80 ops/sec (40265 samples)"
          },
          {
            "name": "packages/lib/benchmarks/core.bench.ts > ObjectPool - acquire 10,000 points",
            "value": 0.1319855357614188,
            "range": "±0.69%",
            "unit": "ms",
            "extra": "7576.59 ops/sec (3789 samples)"
          },
          {
            "name": "packages/lib/benchmarks/core.bench.ts > ObjectPool - acquire/release cycle 1,000 points",
            "value": 0.008119675457533785,
            "range": "±0.07%",
            "unit": "ms",
            "extra": "123157.63 ops/sec (61579 samples)"
          },
          {
            "name": "packages/lib/benchmarks/core.bench.ts > ObjectPool - acquire 1,000 segments",
            "value": 0.018201846559882013,
            "range": "±0.38%",
            "unit": "ms",
            "extra": "54939.48 ops/sec (27470 samples)"
          },
          {
            "name": "packages/lib/benchmarks/core.bench.ts > ObjectPool - acquire 1,000 polygons",
            "value": 0.05819482437151648,
            "range": "±0.28%",
            "unit": "ms",
            "extra": "17183.66 ops/sec (8592 samples)"
          },
          {
            "name": "packages/lib/benchmarks/core.bench.ts > AnimationLoop - create and destroy",
            "value": 0.00014823766351416815,
            "range": "±1.04%",
            "unit": "ms",
            "extra": "6745923.92 ops/sec (3372962 samples)"
          },
          {
            "name": "packages/lib/benchmarks/core.bench.ts > AnimationLoop - add/remove 100 shaders",
            "value": 0.010828221322299608,
            "range": "±1.08%",
            "unit": "ms",
            "extra": "92351.27 ops/sec (46177 samples)"
          },
          {
            "name": "packages/lib/benchmarks/core.bench.ts > AnimationLoop - tick with 50 shaders",
            "value": 0.0034486489085031546,
            "range": "±0.41%",
            "unit": "ms",
            "extra": "289968.63 ops/sec (144985 samples)"
          },
          {
            "name": "packages/lib/benchmarks/core.bench.ts > ShaderRegistry - register 100 shaders",
            "value": 0.010217042012348769,
            "range": "±0.81%",
            "unit": "ms",
            "extra": "97875.69 ops/sec (48938 samples)"
          },
          {
            "name": "packages/lib/benchmarks/core.bench.ts > ShaderRegistry - get shader by name (100 shaders)",
            "value": 0.01103602705984485,
            "range": "±0.70%",
            "unit": "ms",
            "extra": "90612.32 ops/sec (45307 samples)"
          },
          {
            "name": "packages/lib/benchmarks/core.bench.ts > ShaderRegistry - list shaders by geometry",
            "value": 0.02152733185516561,
            "range": "±0.65%",
            "unit": "ms",
            "extra": "46452.58 ops/sec (23227 samples)"
          },
          {
            "name": "packages/lib/benchmarks/core.bench.ts > ConfigResolver - resolve config (simple)",
            "value": 0.00008754893740099077,
            "range": "±0.66%",
            "unit": "ms",
            "extra": "11422183.18 ops/sec (5711092 samples)"
          },
          {
            "name": "packages/lib/benchmarks/core.bench.ts > ConfigResolver - resolve config (full override)",
            "value": 0.0002279016873398111,
            "range": "±0.44%",
            "unit": "ms",
            "extra": "4387856.94 ops/sec (2193929 samples)"
          },
          {
            "name": "packages/lib/benchmarks/core.bench.ts > ConfigResolver - validate config",
            "value": 0.000804713575501643,
            "range": "±0.41%",
            "unit": "ms",
            "extra": "1242678.18 ops/sec (621340 samples)"
          },
          {
            "name": "packages/lib/benchmarks/core.bench.ts > ConfigResolver - resolve + validate 1,000 configs",
            "value": 1.3107160026178157,
            "range": "±0.42%",
            "unit": "ms",
            "extra": "762.94 ops/sec (382 samples)"
          },
          {
            "name": "packages/lib/benchmarks/data-processing.bench.ts > TimeOffsetCalculator - fixed offset (1,000 features)",
            "value": 0.0569562136917737,
            "range": "±1.63%",
            "unit": "ms",
            "extra": "17557.35 ops/sec (8779 samples)"
          },
          {
            "name": "packages/lib/benchmarks/data-processing.bench.ts > TimeOffsetCalculator - random offset (1,000 features)",
            "value": 0.05952718583334964,
            "range": "±1.01%",
            "unit": "ms",
            "extra": "16799.05 ops/sec (8400 samples)"
          },
          {
            "name": "packages/lib/benchmarks/data-processing.bench.ts > TimeOffsetCalculator - range offset (1,000 features)",
            "value": 0.06469863319963211,
            "range": "±0.98%",
            "unit": "ms",
            "extra": "15456.28 ops/sec (7729 samples)"
          },
          {
            "name": "packages/lib/benchmarks/data-processing.bench.ts > TimeOffsetCalculator - property-based offset (1,000 features)",
            "value": 0.06685518772564725,
            "range": "±1.09%",
            "unit": "ms",
            "extra": "14957.70 ops/sec (7479 samples)"
          },
          {
            "name": "packages/lib/benchmarks/data-processing.bench.ts > TimeOffsetCalculator - hash-based offset (1,000 features)",
            "value": 0.09090956909093008,
            "range": "±1.09%",
            "unit": "ms",
            "extra": "10999.94 ops/sec (5500 samples)"
          },
          {
            "name": "packages/lib/benchmarks/data-processing.bench.ts > TimeOffsetCalculator - fixed offset (10,000 features)",
            "value": 0.731552483918118,
            "range": "±4.51%",
            "unit": "ms",
            "extra": "1366.96 ops/sec (684 samples)"
          },
          {
            "name": "packages/lib/benchmarks/data-processing.bench.ts > TimeOffsetCalculator - hash-based offset (10,000 features)",
            "value": 1.0771408881719058,
            "range": "±3.75%",
            "unit": "ms",
            "extra": "928.38 ops/sec (465 samples)"
          },
          {
            "name": "packages/lib/benchmarks/data-processing.bench.ts > TimeOffsetCalculator - expanded offsets (1,000 features, 4 vertices)",
            "value": 0.0639607892043719,
            "range": "±1.18%",
            "unit": "ms",
            "extra": "15634.58 ops/sec (7818 samples)"
          },
          {
            "name": "packages/lib/benchmarks/data-processing.bench.ts > ExpressionEvaluator - compile simple get expression",
            "value": 0.002074146226729301,
            "range": "±0.35%",
            "unit": "ms",
            "extra": "482126.08 ops/sec (241064 samples)"
          },
          {
            "name": "packages/lib/benchmarks/data-processing.bench.ts > ExpressionEvaluator - compile match expression",
            "value": 0.010342635177067402,
            "range": "±0.42%",
            "unit": "ms",
            "extra": "96687.16 ops/sec (48344 samples)"
          },
          {
            "name": "packages/lib/benchmarks/data-processing.bench.ts > ExpressionEvaluator - compile interpolate expression",
            "value": 0.007673038625616932,
            "range": "±0.45%",
            "unit": "ms",
            "extra": "130326.47 ops/sec (65164 samples)"
          },
          {
            "name": "packages/lib/benchmarks/data-processing.bench.ts > ExpressionEvaluator - evaluate get (1,000 features)",
            "value": 0.09302874418602834,
            "range": "±1.18%",
            "unit": "ms",
            "extra": "10749.37 ops/sec (5375 samples)"
          },
          {
            "name": "packages/lib/benchmarks/data-processing.bench.ts > ExpressionEvaluator - evaluate match (1,000 features)",
            "value": 0.11378222684869962,
            "range": "±1.30%",
            "unit": "ms",
            "extra": "8788.72 ops/sec (4395 samples)"
          },
          {
            "name": "packages/lib/benchmarks/data-processing.bench.ts > ExpressionEvaluator - evaluate complex (1,000 features)",
            "value": 0.15094939631753027,
            "range": "±0.96%",
            "unit": "ms",
            "extra": "6624.74 ops/sec (3313 samples)"
          },
          {
            "name": "packages/lib/benchmarks/data-processing.bench.ts > ExpressionEvaluator - multiple expressions (1,000 features)",
            "value": 0.262653236344534,
            "range": "±1.04%",
            "unit": "ms",
            "extra": "3807.30 ops/sec (1904 samples)"
          },
          {
            "name": "packages/lib/benchmarks/data-processing.bench.ts > Color Conversion - hexToRgba (1,000 conversions)",
            "value": 0.17253518771563958,
            "range": "±0.83%",
            "unit": "ms",
            "extra": "5795.92 ops/sec (2898 samples)"
          },
          {
            "name": "packages/lib/benchmarks/data-processing.bench.ts > Color Conversion - rgbaToHex (1,000 conversions)",
            "value": 0.15291303241588514,
            "range": "±0.36%",
            "unit": "ms",
            "extra": "6539.66 ops/sec (3270 samples)"
          },
          {
            "name": "packages/lib/benchmarks/data-processing.bench.ts > Color Conversion - round-trip conversion (1,000 times)",
            "value": 0.34718691741850727,
            "range": "±0.37%",
            "unit": "ms",
            "extra": "2880.29 ops/sec (1441 samples)"
          },
          {
            "name": "packages/lib/benchmarks/data-processing.bench.ts > Coordinate Transformation - lngLat to Mercator (10,000 points)",
            "value": 0.14314116370921745,
            "range": "±0.37%",
            "unit": "ms",
            "extra": "6986.11 ops/sec (3494 samples)"
          },
          {
            "name": "packages/lib/benchmarks/data-processing.bench.ts > Coordinate Transformation - process coordinates array (1,000 lines x 10 pts)",
            "value": 0.791734157480451,
            "range": "±6.08%",
            "unit": "ms",
            "extra": "1263.05 ops/sec (635 samples)"
          },
          {
            "name": "packages/lib/benchmarks/data-processing.bench.ts > Buffer Building - Float32Array allocation (1,000 points, 24 bytes each)",
            "value": 0.0071684036931577485,
            "range": "±3.29%",
            "unit": "ms",
            "extra": "139501.07 ops/sec (69751 samples)"
          },
          {
            "name": "packages/lib/benchmarks/data-processing.bench.ts > Buffer Building - Float32Array allocation (10,000 points)",
            "value": 0.07424930933646953,
            "range": "±5.16%",
            "unit": "ms",
            "extra": "13468.14 ops/sec (6737 samples)"
          },
          {
            "name": "packages/lib/benchmarks/data-processing.bench.ts > Buffer Building - Float32Array fill (1,000 points)",
            "value": 0.0752360529641995,
            "range": "±0.45%",
            "unit": "ms",
            "extra": "13291.50 ops/sec (6646 samples)"
          },
          {
            "name": "packages/lib/benchmarks/data-processing.bench.ts > Buffer Building - Uint16Array index buffer (1,000 quads)",
            "value": 0.0037308010296968654,
            "range": "±0.43%",
            "unit": "ms",
            "extra": "268038.95 ops/sec (134020 samples)"
          },
          {
            "name": "packages/lib/benchmarks/layers.bench.ts > PointShaderLayer - create layer",
            "value": 0.0008226462760531698,
            "range": "±0.90%",
            "unit": "ms",
            "extra": "1215589.29 ops/sec (607796 samples)"
          },
          {
            "name": "packages/lib/benchmarks/layers.bench.ts > PointShaderLayer - onAdd with 100 points",
            "value": 0.009866460662628373,
            "range": "±0.73%",
            "unit": "ms",
            "extra": "101353.47 ops/sec (50677 samples)"
          },
          {
            "name": "packages/lib/benchmarks/layers.bench.ts > PointShaderLayer - onAdd with 1,000 points",
            "value": 0.05872831183932079,
            "range": "±1.37%",
            "unit": "ms",
            "extra": "17027.56 ops/sec (8514 samples)"
          },
          {
            "name": "packages/lib/benchmarks/layers.bench.ts > PointShaderLayer - onAdd with 10,000 points",
            "value": 0.780716650546005,
            "range": "±5.06%",
            "unit": "ms",
            "extra": "1280.87 ops/sec (641 samples)"
          },
          {
            "name": "packages/lib/benchmarks/layers.bench.ts > PointShaderLayer - render cycle (1,000 points)",
            "value": 0.0596761404702233,
            "range": "±1.29%",
            "unit": "ms",
            "extra": "16757.12 ops/sec (8379 samples)"
          },
          {
            "name": "packages/lib/benchmarks/layers.bench.ts > PointShaderLayer - updateConfig (1,000 points)",
            "value": 0.12127928789715944,
            "range": "±1.04%",
            "unit": "ms",
            "extra": "8245.43 ops/sec (4123 samples)"
          },
          {
            "name": "packages/lib/benchmarks/layers.bench.ts > LineShaderLayer - create layer",
            "value": 0.0008933251969340215,
            "range": "±0.39%",
            "unit": "ms",
            "extra": "1119413.18 ops/sec (559707 samples)"
          },
          {
            "name": "packages/lib/benchmarks/layers.bench.ts > LineShaderLayer - onAdd with 100 lines (10 pts each)",
            "value": 0.023202430719256734,
            "range": "±0.82%",
            "unit": "ms",
            "extra": "43098.93 ops/sec (21550 samples)"
          },
          {
            "name": "packages/lib/benchmarks/layers.bench.ts > LineShaderLayer - onAdd with 1,000 lines (10 pts each)",
            "value": 0.20742325922852292,
            "range": "±1.94%",
            "unit": "ms",
            "extra": "4821.06 ops/sec (2411 samples)"
          },
          {
            "name": "packages/lib/benchmarks/layers.bench.ts > LineShaderLayer - onAdd with 100 lines (100 pts each)",
            "value": 0.17601812249208373,
            "range": "±1.81%",
            "unit": "ms",
            "extra": "5681.23 ops/sec (2841 samples)"
          },
          {
            "name": "packages/lib/benchmarks/layers.bench.ts > LineShaderLayer - render cycle (1,000 lines)",
            "value": 0.20471134670487057,
            "range": "±1.91%",
            "unit": "ms",
            "extra": "4884.93 ops/sec (2443 samples)"
          },
          {
            "name": "packages/lib/benchmarks/layers.bench.ts > PolygonShaderLayer - create layer",
            "value": 0.0009270993033790259,
            "range": "±0.14%",
            "unit": "ms",
            "extra": "1078633.10 ops/sec (539317 samples)"
          },
          {
            "name": "packages/lib/benchmarks/layers.bench.ts > PolygonShaderLayer - onAdd with 100 polygons (6 vertices)",
            "value": 0.025479416887487605,
            "range": "±0.63%",
            "unit": "ms",
            "extra": "39247.37 ops/sec (19624 samples)"
          },
          {
            "name": "packages/lib/benchmarks/layers.bench.ts > PolygonShaderLayer - onAdd with 1,000 polygons (6 vertices)",
            "value": 0.24308469275644093,
            "range": "±1.39%",
            "unit": "ms",
            "extra": "4113.79 ops/sec (2057 samples)"
          },
          {
            "name": "packages/lib/benchmarks/layers.bench.ts > PolygonShaderLayer - onAdd with 100 polygons (20 vertices)",
            "value": 0.0692373314871169,
            "range": "±1.10%",
            "unit": "ms",
            "extra": "14443.08 ops/sec (7222 samples)"
          },
          {
            "name": "packages/lib/benchmarks/layers.bench.ts > PolygonShaderLayer - render cycle (1,000 polygons)",
            "value": 0.2363446961247731,
            "range": "±1.51%",
            "unit": "ms",
            "extra": "4231.11 ops/sec (2116 samples)"
          },
          {
            "name": "packages/lib/benchmarks/layers.bench.ts > PolygonShaderLayer - triangulation (complex polygon 50 vertices)",
            "value": 0.16186245307444405,
            "range": "±1.37%",
            "unit": "ms",
            "extra": "6178.09 ops/sec (3090 samples)"
          },
          {
            "name": "packages/lib/benchmarks/layers.bench.ts > Layer Comparison - 1,000 points - full lifecycle",
            "value": 0.06462763306191056,
            "range": "±1.48%",
            "unit": "ms",
            "extra": "15473.26 ops/sec (7737 samples)"
          },
          {
            "name": "packages/lib/benchmarks/layers.bench.ts > Layer Comparison - 1,000 lines - full lifecycle",
            "value": 0.20505393977878528,
            "range": "±1.94%",
            "unit": "ms",
            "extra": "4876.77 ops/sec (2441 samples)"
          },
          {
            "name": "packages/lib/benchmarks/layers.bench.ts > Layer Comparison - 1,000 polygons - full lifecycle",
            "value": 0.22196688371061904,
            "range": "±1.15%",
            "unit": "ms",
            "extra": "4505.18 ops/sec (2253 samples)"
          }
        ]
      },
      {
        "commit": {
          "author": {
            "email": "julien.riel@gmail.com",
            "name": "Julien Riel",
            "username": "julien-riel"
          },
          "committer": {
            "email": "noreply@github.com",
            "name": "GitHub",
            "username": "web-flow"
          },
          "distinct": true,
          "id": "def855616743e1a999597d24f39f202dd8a5e690",
          "message": "Develop (#16)\n\n* Refactor plugin system to introduce examplePlugin and remove thematic plugins\n\n- Updated index.ts to export only examplePlugin and its lazy loading functions.\n- Refactored loaders.ts to support loading of examplePlugin and removed unused thematic plugin loaders.\n- Modified tests to validate the structure and functionality of the new examplePlugin, ensuring it meets expected shader and preset criteria.\n- Adjusted shader tests to focus on the four shaders in the examplePlugin, verifying their structure and uniform handling.\n- Removed references to thematic plugins in various test files, consolidating tests around the new examplePlugin.\n\n* delete: remove RECOMMANDATIONS.md and ROADMAP.md files as part of project restructuring\n\n* delete: remove README.md as part of project restructuring\n\n* docs: add comprehensive project documentation\n\n- README.md: Project overview, installation, API reference, examples\n- ARCHITECTURE.md: Technical architecture, MapLibre integration, shader pipeline\n- PLUGIN_GUIDE.md: Step-by-step guide for creating custom shader plugins\n- RECOMMANDATIONS.md: Improvement recommendations for features, architecture, performance\n\n🤖 Generated with [Claude Code](https://claude.com/claude-code)\n\nCo-Authored-By: Claude Opus 4.5 <noreply@anthropic.com>\n\n* feat: add core infrastructure modules\n\n- Add src/constants.ts with centralized configuration constants\n- Add src/errors/ with typed error hierarchy and error codes\n- Add src/events/ with ShaderEventEmitter for lifecycle events\n- Add src/adapters/ with IMapAdapter interface and MapLibreAdapter\n- Add src/utils/program-cache.ts for WebGL shader program caching\n- Update src/index.ts with new exports\n- Update documentation (README.md, ARCHITECTURE.md)\n\n🤖 Generated with [Claude Code](https://claude.com/claude-code)\n\nCo-Authored-By: Claude Opus 4.5 <noreply@anthropic.com>\n\n* refactor: extract ShaderManager into modular core components\n\nSplit ShaderManager.ts (927 lines) into smaller, focused modules:\n\n- src/core/ShaderState.ts: Shared state management and factory\n- src/core/ShaderRegistration.ts: Shader register/unregister logic\n- src/core/ShaderPlayback.ts: Play/pause/speed/updateConfig control\n- src/core/index.ts: Module exports\n\nShaderManager.ts is now a lightweight facade (316 lines) that delegates\nto the core modules. Public API remains unchanged.\n\n🤖 Generated with [Claude Code](https://claude.com/claude-code)\n\nCo-Authored-By: Claude Opus 4.5 <noreply@anthropic.com>\n\n* docs: update ARCHITECTURE.md with core/ module structure\n\n- Add core/ directory to file structure\n- Add core modules to component responsibilities table\n- Update ShaderManager line count (927 → 316)\n\n🤖 Generated with [Claude Code](https://claude.com/claude-code)\n\nCo-Authored-By: Claude Opus 4.5 <noreply@anthropic.com>\n\n* Add comprehensive tests for deep-freeze utilities, InstancedRenderer, WebGLContext, and GeometryWorker\n\n- Implement tests for deep-freeze functions including deepFreeze, deepFreezeClone, createImmutableConfig, isFrozen, isDeeplyFrozen, mergeConfigs, and unfreeze.\n- Create tests for InstancedRenderer covering initialization, geometry setup, instance data management, drawing, and cleanup.\n- Add tests for WebGLContext to validate context wrapping, VAO management, and instanced drawing capabilities.\n- Introduce tests for GeometryWorker to ensure proper geometry processing, simplification, bounds computation, and buffer generation.\n- Mock necessary WebGL and Worker functionalities to isolate tests and ensure reliability.\n\n* feat: update dependencies and add size-limit for bundle size checks\n\n- Added @size-limit/preset-small-lib and size-limit to devDependencies.\n- Introduced size and size:check scripts for size-limit integration.\n- Updated package-lock.json with new dependencies and their versions.\n- Modified generate-changelog script to use ES module syntax.\n- Updated project name in documentation and comments for clarity.\n- Enhanced color utility functions with detailed JSDoc comments.\n- Refactored ProgramBuilder to use const for isFirstBlock.\n- Updated TypeDoc configuration for new project name and GitHub link.\n\n* feat: implement Phase 2 robustness improvements\n\n- Add WebGL context recovery tests (17 tests)\n- Add MapLibre multi-version compatibility CI workflow\n- Add framework integration examples (React, Vue, Vanilla JS)\n- Add production performance monitoring utility with telemetry support\n\n🤖 Generated with [Claude Code](https://claude.com/claude-code)\n\nCo-Authored-By: Claude Opus 4.5 <noreply@anthropic.com>\n\n* feat: implement Phase 3 - React/Vue wrappers and visual shader editor\n\nReact package (packages/react/):\n- Hooks: useShaderEffect, useShaderManager, useShaderRegistry, usePerformanceMonitor\n- Components: ShaderLayer, AnimatedMap, ShaderProvider\n- Full TypeScript support with comprehensive types\n\nVue package (packages/vue/):\n- Composables: useShaderEffect, useShaderManager, useShaderRegistry, usePerformanceMonitor\n- Components: ShaderLayer.vue, AnimatedMap.vue\n- Vue 3 Composition API with TypeScript\n\nVisual Shader Editor (demo):\n- GLSL syntax editing for vertex and fragment shaders\n- Automatic uniform controls generation\n- Basic GLSL validation\n- Export/Import functionality (JSON)\n- Keyboard shortcut (Ctrl+Enter) to compile\n- Integration with ConfigPanel and MapView\n\n🤖 Generated with [Claude Code](https://claude.com/claude-code)\n\nCo-Authored-By: Claude Opus 4.5 <noreply@anthropic.com>\n\n* refactor: move demo to packages/demo for monorepo structure\n\n- Move demo/ to packages/demo/\n- Update import paths from ../../src to ../../../src and ../../../../src\n- Update vite.config.ts paths for generated-docs and dist output\n- Update package.json scripts to use packages/demo/\n- Fix CI workflow artifact path to dist-demo/\n\n🤖 Generated with [Claude Code](https://claude.com/claude-code)\n\nCo-Authored-By: Claude Opus 4.5 <noreply@anthropic.com>\n\n* chore: configure npm workspaces for monorepo\n\n- Add workspaces configuration to root package.json\n- Create packages/demo/package.json with workspace dependency\n- Update demo imports to use package name instead of relative paths\n- Configure Vite aliases to resolve workspace package to source\n- Update package-lock.json with workspace dependencies\n\nStructure:\n- packages/demo - Interactive playground (private)\n- packages/react - React bindings\n- packages/vue - Vue 3 bindings\n\n🤖 Generated with [Claude Code](https://claude.com/claude-code)\n\nCo-Authored-By: Claude Opus 4.5 <noreply@anthropic.com>\n\n* refactor: move core library to packages/lib for full monorepo structure\n\n- Move src/ to packages/lib/src/\n- Create packages/lib/package.json with library config\n- Create packages/lib/vite.config.ts and tsconfig.json\n- Update root package.json as workspace root (private)\n- Update demo vite.config to resolve from ../lib/src\n- Update vitest.config.ts paths for packages/lib\n- Update scripts/validate-glsl.ts for new path\n- Update typedoc.json entry point\n- Update .size-limit.json bundle paths\n- Update CI workflows for packages/lib/dist\n- Update e2e vite config\n- Create packages/demo/tsconfig.json\n- Remove root vite.config.ts (now in packages/lib)\n\nFinal monorepo structure:\n- packages/lib - Core shader library (maplibre-animated-shaders)\n- packages/demo - Interactive playground\n- packages/react - React bindings\n- packages/vue - Vue 3 bindings\n\n🤖 Generated with [Claude Code](https://claude.com/claude-code)\n\nCo-Authored-By: Claude Opus 4.5 <noreply@anthropic.com>\n\n* refactor: move tests and benchmarks to packages/lib\n\n- Move tests/ to packages/lib/tests/\n- Move benchmarks/ to packages/lib/benchmarks/\n- Update vitest.config.ts paths\n\nAll 924 tests pass.\n\n🤖 Generated with [Claude Code](https://claude.com/claude-code)\n\nCo-Authored-By: Claude Opus 4.5 <noreply@anthropic.com>\n\n* feat: add performance monitoring utility and tests\n\n- Introduced ProductionPerformanceMonitor for tracking FPS, frame times, and GPU metrics.\n- Implemented telemetry reporting capabilities with customizable options.\n- Added event handling for performance-related events such as FPS warnings and context loss.\n- Created tests for the performance monitor covering initialization, metrics collection, event handling, telemetry, and context recovery.\n- Developed tests for WebGL context loss and recovery, ensuring graceful degradation and resource management.\n\n* feat: add initial README, LICENSE, and CHANGELOG files for the library\n\n* refactor: update shader tests to use example namespace and remove visual regression tests\n\n* fix: update test import compatibility path in workflow\n\n* feat: add MapLibre 5.x compatibility\n\nAdd support for the new render() method signature introduced in MapLibre 5.0\nwhile maintaining backward compatibility with 3.x and 4.x versions.\n\nChanges:\n- Add CustomRenderMethodInput type and extractMatrix() helper function\n- Update BaseShaderLayer and GlobalShaderLayer render methods\n- Use type casting when adding layers to the map\n- Fix CI workflow to run test script from project directory\n- Add maintenance documentation for MapLibre compatibility\n\n🤖 Generated with [Claude Code](https://claude.com/claude-code)\n\nCo-Authored-By: Claude Opus 4.5 <noreply@anthropic.com>\n\n* feat: add instanced rendering support to BaseShaderLayer and PointShaderLayer\n\n- Introduced a unified WebGL context wrapper for WebGL 1/2 compatibility.\n- Implemented instanced rendering capabilities in BaseShaderLayer, allowing for efficient rendering of large datasets.\n- Enhanced PointShaderLayer to utilize instanced rendering, including new shaders and attribute management.\n- Added methods for checking instancing support, initializing instanced renderers, and building instance data.\n- Updated tests to accommodate new instanced attributes and functionality.\n\n* chore(lint): fix eslint no-console warnings\n\nAdd eslint-disable-next-line comments for intentional debug logging\nin ShaderState and program-cache. Remove unnecessary debug log and\nfix code formatting in PointShaderLayer.\n\n🤖 Generated with [Claude Code](https://claude.com/claude-code)\n\nCo-Authored-By: Claude Opus 4.5 <noreply@anthropic.com>\n\n---------\n\nCo-authored-by: Claude Opus 4.5 <noreply@anthropic.com>",
          "timestamp": "2026-01-07T20:54:40-05:00",
          "tree_id": "6788923e91c9314cf9f20718a859310b27d0ab84",
          "url": "https://github.com/julien-riel/maplibre-animated-shaders/commit/def855616743e1a999597d24f39f202dd8a5e690"
        },
        "date": 1767837342323,
        "tool": "customSmallerIsBetter",
        "benches": [
          {
            "name": "packages/lib/benchmarks/core.bench.ts > ObjectPool - acquire 1,000 points",
            "value": 0.010898217785538497,
            "range": "±0.75%",
            "unit": "ms",
            "extra": "91758.12 ops/sec (45880 samples)"
          },
          {
            "name": "packages/lib/benchmarks/core.bench.ts > ObjectPool - acquire 10,000 points",
            "value": 0.13254729446065033,
            "range": "±0.92%",
            "unit": "ms",
            "extra": "7544.48 ops/sec (3773 samples)"
          },
          {
            "name": "packages/lib/benchmarks/core.bench.ts > ObjectPool - acquire/release cycle 1,000 points",
            "value": 0.0066179868567293985,
            "range": "±0.06%",
            "unit": "ms",
            "extra": "151103.35 ops/sec (75552 samples)"
          },
          {
            "name": "packages/lib/benchmarks/core.bench.ts > ObjectPool - acquire 1,000 segments",
            "value": 0.019698338809436527,
            "range": "±0.53%",
            "unit": "ms",
            "extra": "50765.70 ops/sec (25383 samples)"
          },
          {
            "name": "packages/lib/benchmarks/core.bench.ts > ObjectPool - acquire 1,000 polygons",
            "value": 0.05682648960110101,
            "range": "±0.36%",
            "unit": "ms",
            "extra": "17597.43 ops/sec (8799 samples)"
          },
          {
            "name": "packages/lib/benchmarks/core.bench.ts > AnimationLoop - create and destroy",
            "value": 0.0001552915147801311,
            "range": "±0.82%",
            "unit": "ms",
            "extra": "6439501.87 ops/sec (3219751 samples)"
          },
          {
            "name": "packages/lib/benchmarks/core.bench.ts > AnimationLoop - add/remove 100 shaders",
            "value": 0.011227821705255945,
            "range": "±0.62%",
            "unit": "ms",
            "extra": "89064.47 ops/sec (44533 samples)"
          },
          {
            "name": "packages/lib/benchmarks/core.bench.ts > AnimationLoop - tick with 50 shaders",
            "value": 0.0034086319578435905,
            "range": "±1.76%",
            "unit": "ms",
            "extra": "293372.83 ops/sec (146687 samples)"
          },
          {
            "name": "packages/lib/benchmarks/core.bench.ts > ShaderRegistry - register 100 shaders",
            "value": 0.012667286126889322,
            "range": "±0.92%",
            "unit": "ms",
            "extra": "78943.51 ops/sec (39472 samples)"
          },
          {
            "name": "packages/lib/benchmarks/core.bench.ts > ShaderRegistry - get shader by name (100 shaders)",
            "value": 0.013362103420622141,
            "range": "±0.80%",
            "unit": "ms",
            "extra": "74838.52 ops/sec (37420 samples)"
          },
          {
            "name": "packages/lib/benchmarks/core.bench.ts > ShaderRegistry - list shaders by geometry",
            "value": 0.025061023907404518,
            "range": "±0.74%",
            "unit": "ms",
            "extra": "39902.60 ops/sec (19952 samples)"
          },
          {
            "name": "packages/lib/benchmarks/core.bench.ts > ConfigResolver - resolve config (simple)",
            "value": 0.00008359421133774392,
            "range": "±0.72%",
            "unit": "ms",
            "extra": "11962550.80 ops/sec (5981276 samples)"
          },
          {
            "name": "packages/lib/benchmarks/core.bench.ts > ConfigResolver - resolve config (full override)",
            "value": 0.00017994770397598554,
            "range": "±0.21%",
            "unit": "ms",
            "extra": "5557170.10 ops/sec (2778586 samples)"
          },
          {
            "name": "packages/lib/benchmarks/core.bench.ts > ConfigResolver - validate config",
            "value": 0.0007831188178654693,
            "range": "±0.88%",
            "unit": "ms",
            "extra": "1276945.44 ops/sec (638473 samples)"
          },
          {
            "name": "packages/lib/benchmarks/core.bench.ts > ConfigResolver - resolve + validate 1,000 configs",
            "value": 1.1661298581396486,
            "range": "±1.49%",
            "unit": "ms",
            "extra": "857.54 ops/sec (430 samples)"
          },
          {
            "name": "packages/lib/benchmarks/data-processing.bench.ts > TimeOffsetCalculator - fixed offset (1,000 features)",
            "value": 0.06111589880224294,
            "range": "±1.67%",
            "unit": "ms",
            "extra": "16362.35 ops/sec (8182 samples)"
          },
          {
            "name": "packages/lib/benchmarks/data-processing.bench.ts > TimeOffsetCalculator - random offset (1,000 features)",
            "value": 0.06409355716483629,
            "range": "±1.03%",
            "unit": "ms",
            "extra": "15602.19 ops/sec (7802 samples)"
          },
          {
            "name": "packages/lib/benchmarks/data-processing.bench.ts > TimeOffsetCalculator - range offset (1,000 features)",
            "value": 0.07028976623559191,
            "range": "±1.03%",
            "unit": "ms",
            "extra": "14226.82 ops/sec (7114 samples)"
          },
          {
            "name": "packages/lib/benchmarks/data-processing.bench.ts > TimeOffsetCalculator - property-based offset (1,000 features)",
            "value": 0.06882866455611204,
            "range": "±1.01%",
            "unit": "ms",
            "extra": "14528.83 ops/sec (7265 samples)"
          },
          {
            "name": "packages/lib/benchmarks/data-processing.bench.ts > TimeOffsetCalculator - hash-based offset (1,000 features)",
            "value": 0.08213735676740182,
            "range": "±0.93%",
            "unit": "ms",
            "extra": "12174.73 ops/sec (6088 samples)"
          },
          {
            "name": "packages/lib/benchmarks/data-processing.bench.ts > TimeOffsetCalculator - fixed offset (10,000 features)",
            "value": 0.8491596932203612,
            "range": "±4.99%",
            "unit": "ms",
            "extra": "1177.63 ops/sec (590 samples)"
          },
          {
            "name": "packages/lib/benchmarks/data-processing.bench.ts > TimeOffsetCalculator - hash-based offset (10,000 features)",
            "value": 1.1614349164732516,
            "range": "±4.00%",
            "unit": "ms",
            "extra": "861.00 ops/sec (431 samples)"
          },
          {
            "name": "packages/lib/benchmarks/data-processing.bench.ts > TimeOffsetCalculator - expanded offsets (1,000 features, 4 vertices)",
            "value": 0.06866979387532288,
            "range": "±1.18%",
            "unit": "ms",
            "extra": "14562.44 ops/sec (7282 samples)"
          },
          {
            "name": "packages/lib/benchmarks/data-processing.bench.ts > ExpressionEvaluator - compile simple get expression",
            "value": 0.0021790125075186444,
            "range": "±0.41%",
            "unit": "ms",
            "extra": "458923.48 ops/sec (229462 samples)"
          },
          {
            "name": "packages/lib/benchmarks/data-processing.bench.ts > ExpressionEvaluator - compile match expression",
            "value": 0.011527570351586131,
            "range": "±0.57%",
            "unit": "ms",
            "extra": "86748.55 ops/sec (43375 samples)"
          },
          {
            "name": "packages/lib/benchmarks/data-processing.bench.ts > ExpressionEvaluator - compile interpolate expression",
            "value": 0.008508410305285163,
            "range": "±0.54%",
            "unit": "ms",
            "extra": "117530.77 ops/sec (58766 samples)"
          },
          {
            "name": "packages/lib/benchmarks/data-processing.bench.ts > ExpressionEvaluator - evaluate get (1,000 features)",
            "value": 0.10136395580782134,
            "range": "±1.29%",
            "unit": "ms",
            "extra": "9865.44 ops/sec (4933 samples)"
          },
          {
            "name": "packages/lib/benchmarks/data-processing.bench.ts > ExpressionEvaluator - evaluate match (1,000 features)",
            "value": 0.11970911746410512,
            "range": "±1.33%",
            "unit": "ms",
            "extra": "8353.58 ops/sec (4180 samples)"
          },
          {
            "name": "packages/lib/benchmarks/data-processing.bench.ts > ExpressionEvaluator - evaluate complex (1,000 features)",
            "value": 0.16209072965965002,
            "range": "±1.12%",
            "unit": "ms",
            "extra": "6169.38 ops/sec (3085 samples)"
          },
          {
            "name": "packages/lib/benchmarks/data-processing.bench.ts > ExpressionEvaluator - multiple expressions (1,000 features)",
            "value": 0.2870937600459895,
            "range": "±1.10%",
            "unit": "ms",
            "extra": "3483.18 ops/sec (1742 samples)"
          },
          {
            "name": "packages/lib/benchmarks/data-processing.bench.ts > Color Conversion - hexToRgba (1,000 conversions)",
            "value": 0.14473683415342778,
            "range": "±0.52%",
            "unit": "ms",
            "extra": "6909.09 ops/sec (3455 samples)"
          },
          {
            "name": "packages/lib/benchmarks/data-processing.bench.ts > Color Conversion - rgbaToHex (1,000 conversions)",
            "value": 0.15581903801806574,
            "range": "±0.46%",
            "unit": "ms",
            "extra": "6417.70 ops/sec (3209 samples)"
          },
          {
            "name": "packages/lib/benchmarks/data-processing.bench.ts > Color Conversion - round-trip conversion (1,000 times)",
            "value": 0.3281798753280751,
            "range": "±0.51%",
            "unit": "ms",
            "extra": "3047.11 ops/sec (1524 samples)"
          },
          {
            "name": "packages/lib/benchmarks/data-processing.bench.ts > Coordinate Transformation - lngLat to Mercator (10,000 points)",
            "value": 0.13894311030840462,
            "range": "±0.50%",
            "unit": "ms",
            "extra": "7197.19 ops/sec (3599 samples)"
          },
          {
            "name": "packages/lib/benchmarks/data-processing.bench.ts > Coordinate Transformation - process coordinates array (1,000 lines x 10 pts)",
            "value": 0.34170997472674175,
            "range": "±0.83%",
            "unit": "ms",
            "extra": "2926.46 ops/sec (1464 samples)"
          },
          {
            "name": "packages/lib/benchmarks/data-processing.bench.ts > Buffer Building - Float32Array allocation (1,000 points, 24 bytes each)",
            "value": 0.012294445621978001,
            "range": "±4.19%",
            "unit": "ms",
            "extra": "81337.54 ops/sec (40669 samples)"
          },
          {
            "name": "packages/lib/benchmarks/data-processing.bench.ts > Buffer Building - Float32Array allocation (10,000 points)",
            "value": 0.039777815940186895,
            "range": "±1.02%",
            "unit": "ms",
            "extra": "25139.64 ops/sec (12572 samples)"
          },
          {
            "name": "packages/lib/benchmarks/data-processing.bench.ts > Buffer Building - Float32Array fill (1,000 points)",
            "value": 0.07608902282410203,
            "range": "±0.55%",
            "unit": "ms",
            "extra": "13142.50 ops/sec (6572 samples)"
          },
          {
            "name": "packages/lib/benchmarks/data-processing.bench.ts > Buffer Building - Uint16Array index buffer (1,000 quads)",
            "value": 0.004196314620699604,
            "range": "±0.61%",
            "unit": "ms",
            "extra": "238304.34 ops/sec (119153 samples)"
          },
          {
            "name": "packages/lib/benchmarks/layers.bench.ts > PointShaderLayer - create layer",
            "value": 0.0008851143567256735,
            "range": "±0.59%",
            "unit": "ms",
            "extra": "1129797.51 ops/sec (564899 samples)"
          },
          {
            "name": "packages/lib/benchmarks/layers.bench.ts > PointShaderLayer - onAdd with 100 points",
            "value": 0.010964713229973196,
            "range": "±0.42%",
            "unit": "ms",
            "extra": "91201.66 ops/sec (45601 samples)"
          },
          {
            "name": "packages/lib/benchmarks/layers.bench.ts > PointShaderLayer - onAdd with 1,000 points",
            "value": 0.0658087186101627,
            "range": "±1.67%",
            "unit": "ms",
            "extra": "15195.55 ops/sec (7598 samples)"
          },
          {
            "name": "packages/lib/benchmarks/layers.bench.ts > PointShaderLayer - onAdd with 10,000 points",
            "value": 0.8878649219858017,
            "range": "±5.47%",
            "unit": "ms",
            "extra": "1126.30 ops/sec (564 samples)"
          },
          {
            "name": "packages/lib/benchmarks/layers.bench.ts > PointShaderLayer - render cycle (1,000 points)",
            "value": 0.06505872833723468,
            "range": "±1.30%",
            "unit": "ms",
            "extra": "15370.73 ops/sec (7686 samples)"
          },
          {
            "name": "packages/lib/benchmarks/layers.bench.ts > PointShaderLayer - updateConfig (1,000 points)",
            "value": 0.12619006611153435,
            "range": "±1.20%",
            "unit": "ms",
            "extra": "7924.55 ops/sec (3963 samples)"
          },
          {
            "name": "packages/lib/benchmarks/layers.bench.ts > LineShaderLayer - create layer",
            "value": 0.0010022552362801774,
            "range": "±0.19%",
            "unit": "ms",
            "extra": "997749.84 ops/sec (498875 samples)"
          },
          {
            "name": "packages/lib/benchmarks/layers.bench.ts > LineShaderLayer - onAdd with 100 lines (10 pts each)",
            "value": 0.029493763168759193,
            "range": "±0.79%",
            "unit": "ms",
            "extra": "33905.47 ops/sec (16953 samples)"
          },
          {
            "name": "packages/lib/benchmarks/layers.bench.ts > LineShaderLayer - onAdd with 1,000 lines (10 pts each)",
            "value": 0.3123236298377227,
            "range": "±2.31%",
            "unit": "ms",
            "extra": "3201.81 ops/sec (1602 samples)"
          },
          {
            "name": "packages/lib/benchmarks/layers.bench.ts > LineShaderLayer - onAdd with 100 lines (100 pts each)",
            "value": 0.23680002982954843,
            "range": "±2.03%",
            "unit": "ms",
            "extra": "4222.97 ops/sec (2112 samples)"
          },
          {
            "name": "packages/lib/benchmarks/layers.bench.ts > LineShaderLayer - render cycle (1,000 lines)",
            "value": 0.29043580081301723,
            "range": "±2.25%",
            "unit": "ms",
            "extra": "3443.10 ops/sec (1722 samples)"
          },
          {
            "name": "packages/lib/benchmarks/layers.bench.ts > PolygonShaderLayer - create layer",
            "value": 0.0010931666531847778,
            "range": "±0.53%",
            "unit": "ms",
            "extra": "914773.60 ops/sec (457387 samples)"
          },
          {
            "name": "packages/lib/benchmarks/layers.bench.ts > PolygonShaderLayer - onAdd with 100 polygons (6 vertices)",
            "value": 0.031849614497742304,
            "range": "±0.91%",
            "unit": "ms",
            "extra": "31397.55 ops/sec (15699 samples)"
          },
          {
            "name": "packages/lib/benchmarks/layers.bench.ts > PolygonShaderLayer - onAdd with 1,000 polygons (6 vertices)",
            "value": 0.294886560141532,
            "range": "±1.29%",
            "unit": "ms",
            "extra": "3391.13 ops/sec (1696 samples)"
          },
          {
            "name": "packages/lib/benchmarks/layers.bench.ts > PolygonShaderLayer - onAdd with 100 polygons (20 vertices)",
            "value": 0.08488435664573497,
            "range": "±0.91%",
            "unit": "ms",
            "extra": "11780.73 ops/sec (5891 samples)"
          },
          {
            "name": "packages/lib/benchmarks/layers.bench.ts > PolygonShaderLayer - render cycle (1,000 polygons)",
            "value": 0.26543912898089567,
            "range": "±1.20%",
            "unit": "ms",
            "extra": "3767.34 ops/sec (1884 samples)"
          },
          {
            "name": "packages/lib/benchmarks/layers.bench.ts > PolygonShaderLayer - triangulation (complex polygon 50 vertices)",
            "value": 0.1884130568952651,
            "range": "±1.46%",
            "unit": "ms",
            "extra": "5307.49 ops/sec (2654 samples)"
          },
          {
            "name": "packages/lib/benchmarks/layers.bench.ts > Layer Comparison - 1,000 points - full lifecycle",
            "value": 0.06412746543544066,
            "range": "±1.42%",
            "unit": "ms",
            "extra": "15593.94 ops/sec (7797 samples)"
          },
          {
            "name": "packages/lib/benchmarks/layers.bench.ts > Layer Comparison - 1,000 lines - full lifecycle",
            "value": 0.27228174142622585,
            "range": "±1.81%",
            "unit": "ms",
            "extra": "3672.67 ops/sec (1837 samples)"
          },
          {
            "name": "packages/lib/benchmarks/layers.bench.ts > Layer Comparison - 1,000 polygons - full lifecycle",
            "value": 0.272097779107754,
            "range": "±1.31%",
            "unit": "ms",
            "extra": "3675.15 ops/sec (1838 samples)"
          }
        ]
      }
    ]
  }
}