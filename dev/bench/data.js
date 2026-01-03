window.BENCHMARK_DATA = {
  "lastUpdate": 1767406553132,
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
      }
    ]
  }
}