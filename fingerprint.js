const crypto = require('crypto');

const GPU_PROFILES = {
  windows: [
    // NVIDIA RTX 40-Series
    {
      id: "rtx4090_win",
      name: "NVIDIA GeForce RTX 4090 (24 GB)",
      vendor: "Google Inc. (NVIDIA)",
      renderer: "ANGLE (NVIDIA, NVIDIA GeForce RTX 4090 (0x00002684) Direct3D11 vs_5_0 ps_5_0, D3D11)",
      gl_vendor: "Google Inc. (NVIDIA)",
      gl_renderer: "ANGLE (NVIDIA, NVIDIA GeForce RTX 4090 (0x00002684) Direct3D11 vs_5_0 ps_5_0, D3D11)"
    },
    {
      id: "rtx4080s_win",
      name: "NVIDIA GeForce RTX 4080 SUPER (16 GB)",
      vendor: "Google Inc. (NVIDIA)",
      renderer: "ANGLE (NVIDIA, NVIDIA GeForce RTX 4080 SUPER (0x00002703) Direct3D11 vs_5_0 ps_5_0, D3D11)",
      gl_vendor: "Google Inc. (NVIDIA)",
      gl_renderer: "ANGLE (NVIDIA, NVIDIA GeForce RTX 4080 SUPER (0x00002703) Direct3D11 vs_5_0 ps_5_0, D3D11)"
    },
    {
      id: "rtx4070tis_win",
      name: "NVIDIA GeForce RTX 4070 Ti SUPER (16 GB)",
      vendor: "Google Inc. (NVIDIA)",
      renderer: "ANGLE (NVIDIA, NVIDIA GeForce RTX 4070 Ti SUPER (0x00002705) Direct3D11 vs_5_0 ps_5_0, D3D11)",
      gl_vendor: "Google Inc. (NVIDIA)",
      gl_renderer: "ANGLE (NVIDIA, NVIDIA GeForce RTX 4070 Ti SUPER (0x00002705) Direct3D11 vs_5_0 ps_5_0, D3D11)"
    },
    {
      id: "rtx4070s_win",
      name: "NVIDIA GeForce RTX 4070 SUPER (12 GB)",
      vendor: "Google Inc. (NVIDIA)",
      renderer: "ANGLE (NVIDIA, NVIDIA GeForce RTX 4070 SUPER (0x00002783) Direct3D11 vs_5_0 ps_5_0, D3D11)",
      gl_vendor: "Google Inc. (NVIDIA)",
      gl_renderer: "ANGLE (NVIDIA, NVIDIA GeForce RTX 4070 SUPER (0x00002783) Direct3D11 vs_5_0 ps_5_0, D3D11)"
    },
    {
      id: "rtx4070_win",
      name: "NVIDIA GeForce RTX 4070 (12 GB)",
      vendor: "Google Inc. (NVIDIA)",
      renderer: "ANGLE (NVIDIA, NVIDIA GeForce RTX 4070 (0x00002786) Direct3D11 vs_5_0 ps_5_0, D3D11)",
      gl_vendor: "Google Inc. (NVIDIA)",
      gl_renderer: "ANGLE (NVIDIA, NVIDIA GeForce RTX 4070 (0x00002786) Direct3D11 vs_5_0 ps_5_0, D3D11)"
    },
    {
      id: "rtx4060ti_win",
      name: "NVIDIA GeForce RTX 4060 Ti (8 GB / 16 GB)",
      vendor: "Google Inc. (NVIDIA)",
      renderer: "ANGLE (NVIDIA, NVIDIA GeForce RTX 4060 Ti (0x00002803) Direct3D11 vs_5_0 ps_5_0, D3D11)",
      gl_vendor: "Google Inc. (NVIDIA)",
      gl_renderer: "ANGLE (NVIDIA, NVIDIA GeForce RTX 4060 Ti (0x00002803) Direct3D11 vs_5_0 ps_5_0, D3D11)"
    },
    {
      id: "rtx4060_win",
      name: "NVIDIA GeForce RTX 4060 (8 GB)",
      vendor: "Google Inc. (NVIDIA)",
      renderer: "ANGLE (NVIDIA, NVIDIA GeForce RTX 4060 (0x00002882) Direct3D11 vs_5_0 ps_5_0, D3D11)",
      gl_vendor: "Google Inc. (NVIDIA)",
      gl_renderer: "ANGLE (NVIDIA, NVIDIA GeForce RTX 4060 (0x00002882) Direct3D11 vs_5_0 ps_5_0, D3D11)"
    },

    // NVIDIA RTX 30-Series
    {
      id: "rtx3090_win",
      name: "NVIDIA GeForce RTX 3090 (24 GB)",
      vendor: "Google Inc. (NVIDIA)",
      renderer: "ANGLE (NVIDIA, NVIDIA GeForce RTX 3090 (0x00002204) Direct3D11 vs_5_0 ps_5_0, D3D11)",
      gl_vendor: "Google Inc. (NVIDIA)",
      gl_renderer: "ANGLE (NVIDIA, NVIDIA GeForce RTX 3090 (0x00002204) Direct3D11 vs_5_0 ps_5_0, D3D11)"
    },
    {
      id: "rtx3080_win",
      name: "NVIDIA GeForce RTX 3080 (10 GB)",
      vendor: "Google Inc. (NVIDIA)",
      renderer: "ANGLE (NVIDIA, NVIDIA GeForce RTX 3080 (0x00002206) Direct3D11 vs_5_0 ps_5_0, D3D11)",
      gl_vendor: "Google Inc. (NVIDIA)",
      gl_renderer: "ANGLE (NVIDIA, NVIDIA GeForce RTX 3080 (0x00002206) Direct3D11 vs_5_0 ps_5_0, D3D11)"
    },
    {
      id: "rtx3070ti_win",
      name: "NVIDIA GeForce RTX 3070 Ti (8 GB)",
      vendor: "Google Inc. (NVIDIA)",
      renderer: "ANGLE (NVIDIA, NVIDIA GeForce RTX 3070 Ti (0x00002482) Direct3D11 vs_5_0 ps_5_0, D3D11)",
      gl_vendor: "Google Inc. (NVIDIA)",
      gl_renderer: "ANGLE (NVIDIA, NVIDIA GeForce RTX 3070 Ti (0x00002482) Direct3D11 vs_5_0 ps_5_0, D3D11)"
    },
    {
      id: "rtx3070_win",
      name: "NVIDIA GeForce RTX 3070 (8 GB)",
      vendor: "Google Inc. (NVIDIA)",
      renderer: "ANGLE (NVIDIA, NVIDIA GeForce RTX 3070 (0x00002484) Direct3D11 vs_5_0 ps_5_0, D3D11)",
      gl_vendor: "Google Inc. (NVIDIA)",
      gl_renderer: "ANGLE (NVIDIA, NVIDIA GeForce RTX 3070 (0x00002484) Direct3D11 vs_5_0 ps_5_0, D3D11)"
    },
    {
      id: "rtx3060ti_win",
      name: "NVIDIA GeForce RTX 3060 Ti (8 GB)",
      vendor: "Google Inc. (NVIDIA)",
      renderer: "ANGLE (NVIDIA, NVIDIA GeForce RTX 3060 Ti (0x00002486) Direct3D11 vs_5_0 ps_5_0, D3D11)",
      gl_vendor: "Google Inc. (NVIDIA)",
      gl_renderer: "ANGLE (NVIDIA, NVIDIA GeForce RTX 3060 Ti (0x00002486) Direct3D11 vs_5_0 ps_5_0, D3D11)"
    },
    {
      id: "rtx3060_win",
      name: "NVIDIA GeForce RTX 3060 (12 GB)",
      vendor: "Google Inc. (NVIDIA)",
      renderer: "ANGLE (NVIDIA, NVIDIA GeForce RTX 3060 (0x00002504) Direct3D11 vs_5_0 ps_5_0, D3D11)",
      gl_vendor: "Google Inc. (NVIDIA)",
      gl_renderer: "ANGLE (NVIDIA, NVIDIA GeForce RTX 3060 (0x00002504) Direct3D11 vs_5_0 ps_5_0, D3D11)"
    },
    {
      id: "rtx3050_win",
      name: "NVIDIA GeForce RTX 3050 (8 GB)",
      vendor: "Google Inc. (NVIDIA)",
      renderer: "ANGLE (NVIDIA, NVIDIA GeForce RTX 3050 (0x00002507) Direct3D11 vs_5_0 ps_5_0, D3D11)",
      gl_vendor: "Google Inc. (NVIDIA)",
      gl_renderer: "ANGLE (NVIDIA, NVIDIA GeForce RTX 3050 (0x00002507) Direct3D11 vs_5_0 ps_5_0, D3D11)"
    },

    // NVIDIA RTX 20 & GTX 16-Series
    {
      id: "rtx2080ti_win",
      name: "NVIDIA GeForce RTX 2080 Ti (11 GB)",
      vendor: "Google Inc. (NVIDIA)",
      renderer: "ANGLE (NVIDIA, NVIDIA GeForce RTX 2080 Ti (0x00001E07) Direct3D11 vs_5_0 ps_5_0, D3D11)",
      gl_vendor: "Google Inc. (NVIDIA)",
      gl_renderer: "ANGLE (NVIDIA, NVIDIA GeForce RTX 2080 Ti (0x00001E07) Direct3D11 vs_5_0 ps_5_0, D3D11)"
    },
    {
      id: "rtx2070s_win",
      name: "NVIDIA GeForce RTX 2070 SUPER (8 GB)",
      vendor: "Google Inc. (NVIDIA)",
      renderer: "ANGLE (NVIDIA, NVIDIA GeForce RTX 2070 SUPER (0x00001E84) Direct3D11 vs_5_0 ps_5_0, D3D11)",
      gl_vendor: "Google Inc. (NVIDIA)",
      gl_renderer: "ANGLE (NVIDIA, NVIDIA GeForce RTX 2070 SUPER (0x00001E84) Direct3D11 vs_5_0 ps_5_0, D3D11)"
    },
    {
      id: "rtx2060s_win",
      name: "NVIDIA GeForce RTX 2060 SUPER (8 GB)",
      vendor: "Google Inc. (NVIDIA)",
      renderer: "ANGLE (NVIDIA, NVIDIA GeForce RTX 2060 SUPER (0x00001F06) Direct3D11 vs_5_0 ps_5_0, D3D11)",
      gl_vendor: "Google Inc. (NVIDIA)",
      gl_renderer: "ANGLE (NVIDIA, NVIDIA GeForce RTX 2060 SUPER (0x00001F06) Direct3D11 vs_5_0 ps_5_0, D3D11)"
    },
    {
      id: "gtx1660s_win",
      name: "NVIDIA GeForce GTX 1660 SUPER (6 GB)",
      vendor: "Google Inc. (NVIDIA)",
      renderer: "ANGLE (NVIDIA, NVIDIA GeForce GTX 1660 SUPER (0x000021C4) Direct3D11 vs_5_0 ps_5_0, D3D11)",
      gl_vendor: "Google Inc. (NVIDIA)",
      gl_renderer: "ANGLE (NVIDIA, NVIDIA GeForce GTX 1660 SUPER (0x000021C4) Direct3D11 vs_5_0 ps_5_0, D3D11)"
    },
    {
      id: "gtx1650_win",
      name: "NVIDIA GeForce GTX 1650 (4 GB)",
      vendor: "Google Inc. (NVIDIA)",
      renderer: "ANGLE (NVIDIA, NVIDIA GeForce GTX 1650 (0x00001F82) Direct3D11 vs_5_0 ps_5_0, D3D11)",
      gl_vendor: "Google Inc. (NVIDIA)",
      gl_renderer: "ANGLE (NVIDIA, NVIDIA GeForce GTX 1650 (0x00001F82) Direct3D11 vs_5_0 ps_5_0, D3D11)"
    },
    {
      id: "gtx1060_win",
      name: "NVIDIA GeForce GTX 1060 6GB",
      vendor: "Google Inc. (NVIDIA)",
      renderer: "ANGLE (NVIDIA, NVIDIA GeForce GTX 1060 6GB (0x00001C03) Direct3D11 vs_5_0 ps_5_0, D3D11)",
      gl_vendor: "Google Inc. (NVIDIA)",
      gl_renderer: "ANGLE (NVIDIA, NVIDIA GeForce GTX 1060 6GB (0x00001C03) Direct3D11 vs_5_0 ps_5_0, D3D11)"
    },

    // AMD Radeon Windows
    {
      id: "radeon7900xtx_win",
      name: "AMD Radeon RX 7900 XTX (24 GB)",
      vendor: "Google Inc. (AMD)",
      renderer: "ANGLE (AMD, AMD Radeon RX 7900 XTX (0x0000744C) Direct3D11 vs_5_0 ps_5_0, D3D11)",
      gl_vendor: "Google Inc. (AMD)",
      gl_renderer: "ANGLE (AMD, AMD Radeon RX 7900 XTX (0x0000744C) Direct3D11 vs_5_0 ps_5_0, D3D11)"
    },
    {
      id: "radeon7800xt_win",
      name: "AMD Radeon RX 7800 XT (16 GB)",
      vendor: "Google Inc. (AMD)",
      renderer: "ANGLE (AMD, AMD Radeon RX 7800 XT (0x0000747E) Direct3D11 vs_5_0 ps_5_0, D3D11)",
      gl_vendor: "Google Inc. (AMD)",
      gl_renderer: "ANGLE (AMD, AMD Radeon RX 7800 XT (0x0000747E) Direct3D11 vs_5_0 ps_5_0, D3D11)"
    },
    {
      id: "radeon6800xt_win",
      name: "AMD Radeon RX 6800 XT (16 GB)",
      vendor: "Google Inc. (AMD)",
      renderer: "ANGLE (AMD, AMD Radeon RX 6800 XT (0x000073BF) Direct3D11 vs_5_0 ps_5_0, D3D11)",
      gl_vendor: "Google Inc. (AMD)",
      gl_renderer: "ANGLE (AMD, AMD Radeon RX 6800 XT (0x000073BF) Direct3D11 vs_5_0 ps_5_0, D3D11)"
    },
    {
      id: "radeon6700xt_win",
      name: "AMD Radeon RX 6700 XT (12 GB)",
      vendor: "Google Inc. (AMD)",
      renderer: "ANGLE (AMD, AMD Radeon RX 6700 XT (0x000073DF) Direct3D11 vs_5_0 ps_5_0, D3D11)",
      gl_vendor: "Google Inc. (AMD)",
      gl_renderer: "ANGLE (AMD, AMD Radeon RX 6700 XT (0x000073DF) Direct3D11 vs_5_0 ps_5_0, D3D11)"
    },
    {
      id: "radeon6600_win",
      name: "AMD Radeon RX 6600 (8 GB)",
      vendor: "Google Inc. (AMD)",
      renderer: "ANGLE (AMD, AMD Radeon RX 6600 (0x000073FF) Direct3D11 vs_5_0 ps_5_0, D3D11)",
      gl_vendor: "Google Inc. (AMD)",
      gl_renderer: "ANGLE (AMD, AMD Radeon RX 6600 (0x000073FF) Direct3D11 vs_5_0 ps_5_0, D3D11)"
    },
    {
      id: "radeon580_win",
      name: "Radeon RX 580 Series (8 GB)",
      vendor: "Google Inc. (AMD)",
      renderer: "ANGLE (AMD, Radeon RX 580 Series (0x000067DF) Direct3D11 vs_5_0 ps_5_0, D3D11)",
      gl_vendor: "Google Inc. (AMD)",
      gl_renderer: "ANGLE (AMD, Radeon RX 580 Series (0x000067DF) Direct3D11 vs_5_0 ps_5_0, D3D11)"
    },

    // Intel Arc & Integrated Windows
    {
      id: "intel_arc_a770_win",
      name: "Intel(R) Arc(TM) A770 Graphics (16 GB)",
      vendor: "Google Inc. (Intel)",
      renderer: "ANGLE (Intel, Intel(R) Arc(TM) A770 Graphics (0x000056A0) Direct3D11 vs_5_0 ps_5_0, D3D11)",
      gl_vendor: "Google Inc. (Intel)",
      gl_renderer: "ANGLE (Intel, Intel(R) Arc(TM) A770 Graphics (0x000056A0) Direct3D11 vs_5_0 ps_5_0, D3D11)"
    },
    {
      id: "intel_arc_a750_win",
      name: "Intel(R) Arc(TM) A750 Graphics (8 GB)",
      vendor: "Google Inc. (Intel)",
      renderer: "ANGLE (Intel, Intel(R) Arc(TM) A750 Graphics (0x000056A1) Direct3D11 vs_5_0 ps_5_0, D3D11)",
      gl_vendor: "Google Inc. (Intel)",
      gl_renderer: "ANGLE (Intel, Intel(R) Arc(TM) A750 Graphics (0x000056A1) Direct3D11 vs_5_0 ps_5_0, D3D11)"
    },
    {
      id: "iris_xe_win",
      name: "Intel(R) Iris(R) Xe Graphics (Core i7/i5 Mobile)",
      vendor: "Google Inc. (Intel)",
      renderer: "ANGLE (Intel, Intel(R) Iris(R) Xe Graphics (0x00009A49) Direct3D11 vs_5_0 ps_5_0, D3D11)",
      gl_vendor: "Google Inc. (Intel)",
      gl_renderer: "ANGLE (Intel, Intel(R) Iris(R) Xe Graphics (0x00009A49) Direct3D11 vs_5_0 ps_5_0, D3D11)"
    },
    {
      id: "intel_uhd_770_win",
      name: "Intel(R) UHD Graphics 770 (13th/14th Gen Core)",
      vendor: "Google Inc. (Intel)",
      renderer: "ANGLE (Intel, Intel(R) UHD Graphics 770 (0x00004680) Direct3D11 vs_5_0 ps_5_0, D3D11)",
      gl_vendor: "Google Inc. (Intel)",
      gl_renderer: "ANGLE (Intel, Intel(R) UHD Graphics 770 (0x00004680) Direct3D11 vs_5_0 ps_5_0, D3D11)"
    },
    {
      id: "intel_uhd_630_win",
      name: "Intel(R) UHD Graphics 630 (8th/9th/10th Gen Core)",
      vendor: "Google Inc. (Intel)",
      renderer: "ANGLE (Intel, Intel(R) UHD Graphics 630 (0x00003E92) Direct3D11 vs_5_0 ps_5_0, D3D11)",
      gl_vendor: "Google Inc. (Intel)",
      gl_renderer: "ANGLE (Intel, Intel(R) UHD Graphics 630 (0x00003E92) Direct3D11 vs_5_0 ps_5_0, D3D11)"
    }
  ],

  macos: [
    // Apple Silicon M4
    {
      id: "m4_max_mac",
      name: "Apple M4 Max (Metal)",
      vendor: "Apple Inc.",
      renderer: "Apple M4 Max",
      gl_vendor: "Apple Inc.",
      gl_renderer: "Apple M4 Max"
    },
    {
      id: "m4_pro_mac",
      name: "Apple M4 Pro (Metal)",
      vendor: "Apple Inc.",
      renderer: "Apple M4 Pro",
      gl_vendor: "Apple Inc.",
      gl_renderer: "Apple M4 Pro"
    },
    {
      id: "m4_mac",
      name: "Apple M4 (Metal)",
      vendor: "Apple Inc.",
      renderer: "Apple M4",
      gl_vendor: "Apple Inc.",
      gl_renderer: "Apple M4"
    },

    // Apple Silicon M3
    {
      id: "m3_max_mac",
      name: "Apple M3 Max (Metal)",
      vendor: "Apple Inc.",
      renderer: "Apple M3 Max",
      gl_vendor: "Apple Inc.",
      gl_renderer: "Apple M3 Max"
    },
    {
      id: "m3_pro_mac",
      name: "Apple M3 Pro (Metal)",
      vendor: "Apple Inc.",
      renderer: "Apple M3 Pro",
      gl_vendor: "Apple Inc.",
      gl_renderer: "Apple M3 Pro"
    },
    {
      id: "m3_mac",
      name: "Apple M3 (Metal)",
      vendor: "Apple Inc.",
      renderer: "Apple M3",
      gl_vendor: "Apple Inc.",
      gl_renderer: "Apple M3"
    },

    // Apple Silicon M2
    {
      id: "m2_ultra_mac",
      name: "Apple M2 Ultra (Metal)",
      vendor: "Apple Inc.",
      renderer: "Apple M2 Ultra",
      gl_vendor: "Apple Inc.",
      gl_renderer: "Apple M2 Ultra"
    },
    {
      id: "m2_max_mac",
      name: "Apple M2 Max (Metal)",
      vendor: "Apple Inc.",
      renderer: "Apple M2 Max",
      gl_vendor: "Apple Inc.",
      gl_renderer: "Apple M2 Max"
    },
    {
      id: "m2_pro_mac",
      name: "Apple M2 Pro (Metal)",
      vendor: "Apple Inc.",
      renderer: "Apple M2 Pro",
      gl_vendor: "Apple Inc.",
      gl_renderer: "Apple M2 Pro"
    },
    {
      id: "m2_mac",
      name: "Apple M2 (Metal)",
      vendor: "Apple Inc.",
      renderer: "Apple M2",
      gl_vendor: "Apple Inc.",
      gl_renderer: "Apple M2"
    },

    // Apple Silicon M1
    {
      id: "m1_ultra_mac",
      name: "Apple M1 Ultra (Metal)",
      vendor: "Apple Inc.",
      renderer: "Apple M1 Ultra",
      gl_vendor: "Apple Inc.",
      gl_renderer: "Apple M1 Ultra"
    },
    {
      id: "m1_max_mac",
      name: "Apple M1 Max (Metal)",
      vendor: "Apple Inc.",
      renderer: "Apple M1 Max",
      gl_vendor: "Apple Inc.",
      gl_renderer: "Apple M1 Max"
    },
    {
      id: "m1_pro_mac",
      name: "Apple M1 Pro (Metal)",
      vendor: "Apple Inc.",
      renderer: "Apple M1 Pro",
      gl_vendor: "Apple Inc.",
      gl_renderer: "Apple M1 Pro"
    },
    {
      id: "m1_mac",
      name: "Apple M1 (Metal)",
      vendor: "Apple Inc.",
      renderer: "Apple M1",
      gl_vendor: "Apple Inc.",
      gl_renderer: "Apple M1"
    },

    // Intel-based Mac
    {
      id: "intel_iris_655_mac",
      name: "Intel Iris Plus Graphics 655 (MacBook Pro 13-inch)",
      vendor: "Apple Inc.",
      renderer: "Intel(R) Iris(TM) Plus Graphics 655",
      gl_vendor: "Apple Inc.",
      gl_renderer: "Intel(R) Iris(TM) Plus Graphics 655"
    },
    {
      id: "amd_radeon_5500m_mac",
      name: "AMD Radeon Pro 5500M (MacBook Pro 16-inch)",
      vendor: "Apple Inc.",
      renderer: "AMD Radeon Pro 5500M OpenGL Engine",
      gl_vendor: "Apple Inc.",
      gl_renderer: "AMD Radeon Pro 5500M OpenGL Engine"
    }
  ],

  linux: [
    {
      id: "nvidia_rtx4090_linux",
      name: "NVIDIA GeForce RTX 4090 (NVIDIA Proprietary)",
      vendor: "NVIDIA Corporation",
      renderer: "NVIDIA GeForce RTX 4090/PCIe/SSE2",
      gl_vendor: "NVIDIA Corporation",
      gl_renderer: "NVIDIA GeForce RTX 4090/PCIe/SSE2"
    },
    {
      id: "nvidia_rtx4070_linux",
      name: "NVIDIA GeForce RTX 4070 (NVIDIA Proprietary)",
      vendor: "NVIDIA Corporation",
      renderer: "NVIDIA GeForce RTX 4070/PCIe/SSE2",
      gl_vendor: "NVIDIA Corporation",
      gl_renderer: "NVIDIA GeForce RTX 4070/PCIe/SSE2"
    },
    {
      id: "nvidia_rtx3080_linux",
      name: "NVIDIA GeForce RTX 3080 (NVIDIA Proprietary)",
      vendor: "NVIDIA Corporation",
      renderer: "NVIDIA GeForce RTX 3080/PCIe/SSE2",
      gl_vendor: "NVIDIA Corporation",
      gl_renderer: "NVIDIA GeForce RTX 3080/PCIe/SSE2"
    },
    {
      id: "nvidia_rtx3060_linux",
      name: "NVIDIA GeForce RTX 3060 (NVIDIA Proprietary)",
      vendor: "NVIDIA Corporation",
      renderer: "NVIDIA GeForce RTX 3060/PCIe/SSE2",
      gl_vendor: "NVIDIA Corporation",
      gl_renderer: "NVIDIA GeForce RTX 3060/PCIe/SSE2"
    },
    {
      id: "amd_rx7900xtx_linux",
      name: "AMD Radeon RX 7900 XTX (Mesa / RADV)",
      vendor: "Mesa/X.org",
      renderer: "AMD Radeon RX 7900 XTX (radeonsi, gfx1100, LLVM 18.1.1, DRM 3.57)",
      gl_vendor: "Mesa/X.org",
      gl_renderer: "AMD Radeon RX 7900 XTX (radeonsi, gfx1100, LLVM 18.1.1, DRM 3.57)"
    },
    {
      id: "amd_rx6700xt_linux",
      name: "AMD Radeon RX 6700 XT (Mesa / RADV)",
      vendor: "Mesa/X.org",
      renderer: "AMD Radeon RX 6700 XT (radeonsi, navi22, LLVM 17.0.6, DRM 3.54)",
      gl_vendor: "Mesa/X.org",
      gl_renderer: "AMD Radeon RX 6700 XT (radeonsi, navi22, LLVM 17.0.6, DRM 3.54)"
    },
    {
      id: "amd_rx580_linux",
      name: "AMD Radeon RX 580 Series (Mesa / RADV)",
      vendor: "Mesa/X.org",
      renderer: "Radeon RX 580 Series (POLARIS10, DRM 3.42.0, 5.15.0, LLVM 15.0.7)",
      gl_vendor: "Mesa/X.org",
      gl_renderer: "Radeon RX 580 Series (POLARIS10, DRM 3.42.0, 5.15.0, LLVM 15.0.7)"
    },
    {
      id: "intel_iris_xe_linux",
      name: "Mesa Intel(R) Iris(R) Xe Graphics (TGL GT2)",
      vendor: "Mesa",
      renderer: "Mesa Intel(R) Iris(R) Xe Graphics (TGL GT2)",
      gl_vendor: "Mesa",
      gl_renderer: "Mesa Intel(R) Iris(R) Xe Graphics (TGL GT2)"
    },
    {
      id: "intel_uhd_630_linux",
      name: "Mesa Intel(R) UHD Graphics 630 (CFL GT2)",
      vendor: "Mesa",
      renderer: "Mesa Intel(R) UHD Graphics 630 (CFL GT2)",
      gl_vendor: "Mesa",
      gl_renderer: "Mesa Intel(R) UHD Graphics 630 (CFL GT2)"
    }
  ],
  android: [
    {
      id: "adreno_750",
      name: "Qualcomm Adreno (TM) 750 (Galaxy S24 Ultra / Xiaomi 14)",
      vendor: "Google Inc. (Qualcomm)",
      renderer: "ANGLE (Qualcomm, Adreno (TM) 750, OpenGL ES 3.2)",
      gl_vendor: "Qualcomm",
      gl_renderer: "Adreno (TM) 750"
    },
    {
      id: "adreno_740",
      name: "Qualcomm Adreno (TM) 740 (Galaxy S23 Ultra / OnePlus 11)",
      vendor: "Google Inc. (Qualcomm)",
      renderer: "ANGLE (Qualcomm, Adreno (TM) 740, OpenGL ES 3.2)",
      gl_vendor: "Qualcomm",
      gl_renderer: "Adreno (TM) 740"
    },
    {
      id: "adreno_730",
      name: "Qualcomm Adreno (TM) 730 (Galaxy S22 / Snapdragon 8 Gen 1)",
      vendor: "Google Inc. (Qualcomm)",
      renderer: "ANGLE (Qualcomm, Adreno (TM) 730, OpenGL ES 3.2)",
      gl_vendor: "Qualcomm",
      gl_renderer: "Adreno (TM) 730"
    },
    {
      id: "adreno_660",
      name: "Qualcomm Adreno (TM) 660 (Galaxy S21 / Snapdragon 888)",
      vendor: "Google Inc. (Qualcomm)",
      renderer: "ANGLE (Qualcomm, Adreno (TM) 660, OpenGL ES 3.2)",
      gl_vendor: "Qualcomm",
      gl_renderer: "Adreno (TM) 660"
    },
    {
      id: "adreno_650",
      name: "Qualcomm Adreno (TM) 650 (Galaxy S20 / Snapdragon 865)",
      vendor: "Google Inc. (Qualcomm)",
      renderer: "ANGLE (Qualcomm, Adreno (TM) 650, OpenGL ES 3.2)",
      gl_vendor: "Qualcomm",
      gl_renderer: "Adreno (TM) 650"
    },
    {
      id: "adreno_619",
      name: "Qualcomm Adreno (TM) 619 (Snapdragon 750G / 695 5G)",
      vendor: "Google Inc. (Qualcomm)",
      renderer: "ANGLE (Qualcomm, Adreno (TM) 619, OpenGL ES 3.2)",
      gl_vendor: "Qualcomm",
      gl_renderer: "Adreno (TM) 619"
    },
    {
      id: "mali_g720",
      name: "ARM Immortalis-G720 MC12 (MediaTek Dimensity 9300)",
      vendor: "Google Inc. (ARM)",
      renderer: "ANGLE (ARM, Mali-G720 Immortalis MC12, OpenGL ES 3.2)",
      gl_vendor: "ARM",
      gl_renderer: "Mali-G720 Immortalis MC12"
    },
    {
      id: "mali_g715",
      name: "ARM Mali-G715 Immortalis MC11 (Google Tensor G3 / Pixel 8 Pro)",
      vendor: "Google Inc. (ARM)",
      renderer: "ANGLE (ARM, Mali-G715 Immortalis MC11, OpenGL ES 3.2)",
      gl_vendor: "ARM",
      gl_renderer: "Mali-G715 Immortalis MC11"
    },
    {
      id: "mali_g710",
      name: "ARM Mali-G710 MC10 (Google Tensor G2 / Pixel 7 Pro)",
      vendor: "Google Inc. (ARM)",
      renderer: "ANGLE (ARM, Mali-G710 MC10, OpenGL ES 3.2)",
      gl_vendor: "ARM",
      gl_renderer: "Mali-G710 MC10"
    },
    {
      id: "mali_g78",
      name: "ARM Mali-G78 MP14 (Google Tensor G1 / Exynos 2100)",
      vendor: "Google Inc. (ARM)",
      renderer: "ANGLE (ARM, Mali-G78 MP14, OpenGL ES 3.2)",
      gl_vendor: "ARM",
      gl_renderer: "Mali-G78 MP14"
    },
    {
      id: "mali_g68",
      name: "ARM Mali-G68 MP5 (Samsung Galaxy A54 / Exynos 1380)",
      vendor: "Google Inc. (ARM)",
      renderer: "ANGLE (ARM, Mali-G68 MP5, OpenGL ES 3.2)",
      gl_vendor: "ARM",
      gl_renderer: "Mali-G68 MP5"
    },
    {
      id: "samsung_xclipse_940",
      name: "Samsung Xclipse 940 (Galaxy S24 / Exynos 2400)",
      vendor: "Google Inc. (Samsung)",
      renderer: "ANGLE (Samsung, Samsung Xclipse 940, OpenGL ES 3.2)",
      gl_vendor: "Samsung",
      gl_renderer: "Samsung Xclipse 940"
    }
  ],
  ios: [
    {
      id: "apple_a17_pro",
      name: "Apple A17 Pro GPU (iPhone 15 Pro / Pro Max)",
      vendor: "Apple Inc.",
      renderer: "Apple GPU",
      gl_vendor: "Apple Inc.",
      gl_renderer: "Apple GPU"
    },
    {
      id: "apple_a16_bionic",
      name: "Apple A16 Bionic GPU (iPhone 15 / 14 Pro)",
      vendor: "Apple Inc.",
      renderer: "Apple GPU",
      gl_vendor: "Apple Inc.",
      gl_renderer: "Apple GPU"
    },
    {
      id: "apple_a15_bionic",
      name: "Apple A15 Bionic GPU (iPhone 14 / 13 / 13 Pro)",
      vendor: "Apple Inc.",
      renderer: "Apple GPU",
      gl_vendor: "Apple Inc.",
      gl_renderer: "Apple GPU"
    },
    {
      id: "apple_a14_bionic",
      name: "Apple A14 Bionic GPU (iPhone 12 / iPad Air 4)",
      vendor: "Apple Inc.",
      renderer: "Apple GPU",
      gl_vendor: "Apple Inc.",
      gl_renderer: "Apple GPU"
    },
    {
      id: "apple_m2_ipad",
      name: "Apple M2 GPU (iPad Pro 12.9 / 11 M2)",
      vendor: "Apple Inc.",
      renderer: "Apple GPU",
      gl_vendor: "Apple Inc.",
      gl_renderer: "Apple GPU"
    },
    {
      id: "apple_m1_ipad",
      name: "Apple M1 GPU (iPad Pro / iPad Air 5)",
      vendor: "Apple Inc.",
      renderer: "Apple GPU",
      gl_vendor: "Apple Inc.",
      gl_renderer: "Apple GPU"
    }
  ]
};

const RESOLUTIONS = [
  // Mobile Smartphones (CSS Viewports)
  { width: 412, height: 915, label: "412 x 915 (Samsung Galaxy S24/S23 Ultra, Xiaomi 14)" },
  { width: 430, height: 932, label: "430 x 932 (Apple iPhone 15 Pro Max / 14 Pro Max)" },
  { width: 393, height: 852, label: "393 x 852 (Apple iPhone 15 Pro / 15 / 14 Pro)" },
  { width: 390, height: 844, label: "390 x 844 (Apple iPhone 14 / 13 / 12)" },
  { width: 412, height: 892, label: "412 x 892 (Google Pixel 8 Pro / Pixel 7 Pro)" },
  { width: 360, height: 800, label: "360 x 800 (Samsung Galaxy A-серия)" },
  { width: 384, height: 854, label: "384 x 854 (Sony Xperia / Компактные Android)" },

  // Mobile Tablets
  { width: 1024, height: 1366, label: "1024 x 1366 (Apple iPad Pro 12.9)" },
  { width: 834, height: 1194, label: "834 x 1194 (Apple iPad Pro 11 / Air)" },
  { width: 800, height: 1280, label: "800 x 1280 (Samsung Galaxy Tab S9)" },
  // 16:9 Standard & High-End Desktop
  { width: 1920, height: 1080, label: "1920 x 1080 (FHD 16:9 - Популярный десктоп)" },
  { width: 2560, height: 1440, label: "2560 x 1440 (2K QHD 16:9 - Геймерский монитор)" },
  { width: 3840, height: 2160, label: "3840 x 2160 (4K UHD 16:9 - Высокое разрешение)" },
  { width: 1600, height: 900, label: "1600 x 900 (HD+ 16:9)" },
  { width: 1366, height: 768, label: "1366 x 768 (WXGA 16:9 - Бюджетные ноутбуки)" },
  { width: 1280, height: 720, label: "1280 x 720 (HD 16:9)" },

  // Laptops (Windows / Ultrabooks)
  { width: 1536, height: 864, label: "1536 x 864 (Современные Windows ноутбуки 125%)" },
  { width: 1920, height: 1200, label: "1920 x 1200 (WUXGA 16:10 - Бизнес ноутбуки)" },
  { width: 2256, height: 1504, label: "2256 x 1504 (Surface Laptop 3:2)" },
  { width: 2880, height: 1920, label: "2880 x 1920 (Surface Pro 3:2)" },

  // Apple MacBooks & Retina
  { width: 3456, height: 2234, label: "3456 x 2234 (MacBook Pro 16\" M1/M2/M3 Liquid Retina)" },
  { width: 3024, height: 1964, label: "3024 x 1964 (MacBook Pro 14\" M1/M2/M3 Liquid Retina)" },
  { width: 2880, height: 1800, label: "2880 x 1800 (MacBook Pro 15\" Retina)" },
  { width: 2560, height: 1600, label: "2560 x 1600 (MacBook Pro 13\" / Air 13\" Retina)" },
  { width: 1680, height: 1050, label: "1680 x 1050 (MacBook Pro 15\" Масштабированное)" },
  { width: 1440, height: 900, label: "1440 x 900 (MacBook Air 13\" Стандартное)" },

  // Ultrawide
  { width: 3440, height: 1440, label: "3440 x 1440 (UWQHD 21:9 - Ультраширокий)" },
  { width: 2560, height: 1080, label: "2560 x 1080 (WFHD 21:9 - Ультраширокий)" },
  { width: 5120, height: 1440, label: "5120 x 1440 (Dual QHD 32:9 - Super Ultrawide)" }
];

const CPU_CORES_LIST = [2, 4, 6, 8, 10, 12, 14, 16, 20, 24, 32, 64];
const RAM_LIST = [4, 6, 8, 12, 16, 24, 32, 48, 64, 96, 128];

const TIMEZONES = [
  { id: "auto", label: "Автоматически (по IP адресу прокси)" },
  { id: "Europe/Moscow", label: "Europe/Moscow (UTC+3, Москва)" },
  { id: "Europe/London", label: "Europe/London (UTC+0, Лондон)" },
  { id: "Europe/Berlin", label: "Europe/Berlin (UTC+1, Берлин / Франкфурт)" },
  { id: "Europe/Paris", label: "Europe/Paris (UTC+1, Париж)" },
  { id: "Europe/Amsterdam", label: "Europe/Amsterdam (UTC+1, Амстердам)" },
  { id: "Europe/Warsaw", label: "Europe/Warsaw (UTC+1, Варшава)" },
  { id: "Europe/Kyiv", label: "Europe/Kyiv (UTC+2, Киев)" },
  { id: "Europe/Istanbul", label: "Europe/Istanbul (UTC+3, Стамбул)" },
  { id: "America/New_York", label: "America/New_York (UTC-5, Нью-Йорк)" },
  { id: "America/Chicago", label: "America/Chicago (UTC-6, Чикаго)" },
  { id: "America/Denver", label: "America/Denver (UTC-7, Денвер)" },
  { id: "America/Los_Angeles", label: "America/Los_Angeles (UTC-8, Лос-Анджелес / Силиконовая долина)" },
  { id: "America/Toronto", label: "America/Toronto (UTC-5, Торонто)" },
  { id: "America/Sao_Paulo", label: "America/Sao_Paulo (UTC-3, Сан-Паулу)" },
  { id: "Asia/Dubai", label: "Asia/Dubai (UTC+4, Дубай / ОАЭ)" },
  { id: "Asia/Singapore", label: "Asia/Singapore (UTC+8, Сингапур)" },
  { id: "Asia/Hong_Kong", label: "Asia/Hong_Kong (UTC+8, Гонконг)" },
  { id: "Asia/Tokyo", label: "Asia/Tokyo (UTC+9, Токио)" },
  { id: "Asia/Seoul", label: "Asia/Seoul (UTC+9, Сеул)" },
  { id: "Australia/Sydney", label: "Australia/Sydney (UTC+10, Сидней)" }
];

const LOCALES = [
  { id: "ru-RU", label: "Русский (ru-RU, ru)", acceptLanguage: "ru-RU,ru;q=0.9,en-US;q=0.8,en;q=0.7" },
  { id: "en-US", label: "English US (en-US, en)", acceptLanguage: "en-US,en;q=0.9" },
  { id: "en-GB", label: "English UK (en-GB, en)", acceptLanguage: "en-GB,en;q=0.9,en-US;q=0.8" },
  { id: "de-DE", label: "Deutsch (de-DE, de)", acceptLanguage: "de-DE,de;q=0.9,en-US;q=0.8,en;q=0.7" },
  { id: "fr-FR", label: "Français (fr-FR, fr)", acceptLanguage: "fr-FR,fr;q=0.9,en-US;q=0.8,en;q=0.7" },
  { id: "es-ES", label: "Español (es-ES, es)", acceptLanguage: "es-ES,es;q=0.9,en-US;q=0.8,en;q=0.7" },
  { id: "pt-BR", label: "Português Brasil (pt-BR, pt)", acceptLanguage: "pt-BR,pt;q=0.9,en-US;q=0.8,en;q=0.7" },
  { id: "it-IT", label: "Italiano (it-IT, it)", acceptLanguage: "it-IT,it;q=0.9,en-US;q=0.8,en;q=0.7" },
  { id: "nl-NL", label: "Nederlands (nl-NL, nl)", acceptLanguage: "nl-NL,nl;q=0.9,en-US;q=0.8,en;q=0.7" },
  { id: "pl-PL", label: "Polski (pl-PL, pl)", acceptLanguage: "pl-PL,pl;q=0.9,en-US;q=0.8,en;q=0.7" },
  { id: "tr-TR", label: "Türkçe (tr-TR, tr)", acceptLanguage: "tr-TR,tr;q=0.9,en-US;q=0.8,en;q=0.7" },
  { id: "uk-UA", label: "Українська (uk-UA, uk)", acceptLanguage: "uk-UA,uk;q=0.9,en-US;q=0.8,en;q=0.7" },
  { id: "ja-JP", label: "日本語 (ja-JP, ja)", acceptLanguage: "ja-JP,ja;q=0.9,en-US;q=0.8,en;q=0.7" },
  { id: "zh-CN", label: "中文 简体 (zh-CN, zh)", acceptLanguage: "zh-CN,zh;q=0.9,en-US;q=0.8,en;q=0.7" }
];

const WEBRTC_MODES = [
  { id: "proxy_only", label: "Защищенный (Только через прокси, UDP-leak заблокирован)" },
  { id: "disabled", label: "Отключен полностью (WebRTC Disabled)" },
  { id: "real", label: "Реальный (Прямой IP)" }
];

// OS User Agents Library
const UA_PRESETS = {
  windows: [
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/155.0.0.0 Safari/537.36",
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/133.0.0.0 Safari/537.36",
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/132.0.0.0 Safari/537.36",
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36"
  ],
  macos: [
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/155.0.0.0 Safari/537.36",
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/133.0.0.0 Safari/537.36",
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/132.0.0.0 Safari/537.36"
  ],
  linux: [
    "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/155.0.0.0 Safari/537.36",
    "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/133.0.0.0 Safari/537.36"
  ],
  android: [
    "Mozilla/5.0 (Linux; Android 14; SM-S928B) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/133.0.0.0 Mobile Safari/537.36",
    "Mozilla/5.0 (Linux; Android 14; Pixel 8 Pro) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/133.0.0.0 Mobile Safari/537.36",
    "Mozilla/5.0 (Linux; Android 14; SM-S918B) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/132.0.0.0 Mobile Safari/537.36",
    "Mozilla/5.0 (Linux; Android 14; 23116PN5BC) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/132.0.0.0 Mobile Safari/537.36",
    "Mozilla/5.0 (Linux; Android 14; CPH2581) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/133.0.0.0 Mobile Safari/537.36",
    "Mozilla/5.0 (Linux; Android 13; SM-A546B) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Mobile Safari/537.36",
    "Mozilla/5.0 (Linux; Android 13; Pixel 7 Pro) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Mobile Safari/537.36"
  ],
  ios: [
    "Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) CriOS/133.0.0.0 Mobile/15E148 Safari/604.1",
    "Mozilla/5.0 (iPhone; CPU iPhone OS 17_4_1 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) CriOS/132.0.0.0 Mobile/15E148 Safari/604.1",
    "Mozilla/5.0 (iPhone; CPU iPhone OS 17_3 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) CriOS/132.0.0.0 Mobile/15E148 Safari/604.1",
    "Mozilla/5.0 (iPhone; CPU iPhone OS 16_6 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) CriOS/131.0.0.0 Mobile/15E148 Safari/604.1",
    "Mozilla/5.0 (iPad; CPU OS 17_4 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) CriOS/132.0.0.0 Mobile/15E148 Safari/604.1"
  ]
};

function generateFingerprint(osName = "windows", profileId = null, browserVersion = "155", overrides = {}) {
  osName = (osName || "windows").toLowerCase();
  if (!GPU_PROFILES[osName]) osName = "windows";

  const seedStr = profileId || crypto.randomUUID();
  // Use independent slices of SHA256 to avoid parameter correlation
  const fullHash = crypto.createHash('sha256').update(seedStr).digest('hex');
  const s0 = parseInt(fullHash.slice(0,  8), 16);  // gpu
  const s1 = parseInt(fullHash.slice(8,  16), 16); // resolution / mobile res
  const s2 = parseInt(fullHash.slice(16, 24), 16); // cores
  const s3 = parseInt(fullHash.slice(24, 32), 16); // ram
  const s4 = parseInt(fullHash.slice(32, 40), 16); // ua selection
  const s5 = parseInt(fullHash.slice(40, 48), 16); // canvas seed
  const s6 = parseInt(fullHash.slice(48, 56), 16); // audio seed
  const s7 = parseInt(fullHash.slice(56, 64), 16); // misc (model, etc.)

  const gpus = GPU_PROFILES[osName];
  const gpu = gpus[(s0 >>> 0) % gpus.length];

  let res;
  let cores;
  let ram;
  let platform, chPlatform, chVersion, chArch, chBitness, chModel, isMobile;
  let pixelRatio = 1.0;

  if (osName === "android") {
    const mobileRes = [
      { width: 412, height: 915, ratio: 3.5 },
      { width: 412, height: 892, ratio: 3.5 },
      { width: 393, height: 873, ratio: 3.0 },
      { width: 360, height: 800, ratio: 2.0 },
      { width: 384, height: 854, ratio: 2.8125 }
    ];
    const rObj = mobileRes[(s1 >>> 0) % mobileRes.length];
    res = { width: rObj.width, height: rObj.height };
    pixelRatio = rObj.ratio;

    cores = [8, 8, 8, 8, 6][(s2 >>> 0) % 5];
    ram   = [8, 12, 12, 16, 8][(s3 >>> 0) % 5];

    platform  = "Linux armv8l";
    chPlatform = "Android";
    chVersion = "14.0.0";
    chArch    = "arm";
    chBitness = "64";
    isMobile  = true;

    if (gpu.id.includes("750")) {
      chModel = ((s7 >>> 0) % 2 === 0) ? "SM-S928B" : "23116PN5BC";
    } else if (gpu.id.includes("740")) {
      chModel = "SM-S918B";
    } else if (gpu.id.includes("mali_g715")) {
      chModel = "Pixel 8 Pro";
    } else if (gpu.id.includes("mali_g710")) {
      chModel = "Pixel 7 Pro";
    } else if (gpu.id.includes("xclipse")) {
      chModel = "SM-S921B";
    } else {
      chModel = "SM-A546B";
    }
  } else if (osName === "ios") {
    const isTablet = gpu.id.includes("ipad");
    if (isTablet) {
      res = { width: 1024, height: 1366 };
      pixelRatio = 2.0;
      cores = 8;
      ram = [8, 16][(s3 >>> 0) % 2];
      platform = "iPad";
      chModel  = "iPad";
    } else {
      const iosRes = [
        { width: 430, height: 932, ratio: 3.0 },
        { width: 393, height: 852, ratio: 3.0 },
        { width: 390, height: 844, ratio: 3.0 }
      ];
      const rObj = iosRes[(s1 >>> 0) % iosRes.length];
      res = { width: rObj.width, height: rObj.height };
      pixelRatio = rObj.ratio;
      cores = 6;
      ram   = [6, 8][(s3 >>> 0) % 2];
      platform = "iPhone";
      chModel  = "iPhone";
    }

    chPlatform = "iOS";
    chVersion  = "17.5.0";
    chArch     = "arm";
    chBitness  = "64";
    isMobile   = true;
  } else {
    // Desktop (windows, macos, linux)
    res = RESOLUTIONS[(s1 >>> 0) % RESOLUTIONS.length];
    const coresOptions = [4, 6, 8, 12, 16];
    const ramOptions   = [8, 16, 32, 64];
    cores    = coresOptions[(s2 >>> 0) % coresOptions.length];
    ram      = ramOptions[(s3 >>> 0) % ramOptions.length];
    isMobile = false;
    chModel  = "";
    chArch   = "x86";
    chBitness = "64";

    if (osName === "windows") {
      platform   = "Win32";
      chPlatform = "Windows";
      chVersion  = "15.0.0";
      pixelRatio = 1.0;
    } else if (osName === "macos") {
      platform   = "MacIntel";
      chPlatform = "macOS";
      chVersion  = "14.5.0";
      pixelRatio = 2.0;
    } else {
      platform   = "Linux x86_64";
      chPlatform = "Linux";
      chVersion  = "6.8.0";
      pixelRatio = 1.0;
    }
  }

  const uas = UA_PRESETS[osName] || UA_PRESETS.windows;
  let ua = uas[(s4 >>> 0) % uas.length];
  if (osName === "android" && chModel) {
    ua = `Mozilla/5.0 (Linux; Android 14; ${chModel}) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/133.0.0.0 Mobile Safari/537.36`;
  }

  // Independent canvas and audio seeds — no correlation with GPU or resolution
  const canvasSeed = ((s5 >>> 0) % 100000) / 10000000.0; // range: ~0.000001 – 0.009999
  const audioSeed  = ((s6 >>> 0) % 100000) / 100000000.0; // range: ~0.000000 – 0.000999

  // avail_height is in logical (CSS) pixels — OS already handles DPI scaling,
  // so pixelRatio must NOT be applied here.
  let availHeightOffset;
  if (isMobile) {
    availHeightOffset = 0;
  } else if (osName === "macos") {
    availHeightOffset = 93; // menubar ~25px + dock ~68px (logical px)
  } else {
    availHeightOffset = 40; // taskbar on Windows/Linux (logical px, DPI-independent)
  }

  // Extract major Chrome version from UA for consistent Client Hints brands
  const uaMajorMatch = ua.match(/Chrome\/(\d+)/);
  const uaMajorVersion = uaMajorMatch ? uaMajorMatch[1] : browserVersion;

  const fp = {
    profile_id: seedStr,
    os: osName,
    browser_version: uaMajorVersion,
    user_agent: ua,
    platform: platform,
    client_hints: {
      platform: chPlatform,
      platform_version: chVersion,
      architecture: chArch,
      bitness: chBitness,
      model: chModel,
      mobile: isMobile,
      brands: [
        { brand: "Chromium",      version: uaMajorVersion },
        { brand: "Google Chrome", version: uaMajorVersion },
        { brand: "Not-A.Brand",   version: "24" }
      ]
    },
    screen: {
      width:        res.width,
      height:       res.height,
      avail_width:  res.width,
      avail_height: res.height - availHeightOffset,
      color_depth:  24,
      pixel_ratio:  pixelRatio
    },
    hardware: {
      concurrency: cores,
      memory:      ram
    },
    webgl: {
      unmasked_vendor:   gpu.vendor,
      unmasked_renderer: gpu.renderer,
      vendor:            gpu.gl_vendor,
      renderer:          gpu.gl_renderer
    },
    canvas_noise: true,
    canvas_seed:  canvasSeed,
    audio_noise:  true,
    audio_seed:   audioSeed,
    webrtc_mode:  "proxy_only",
    timezone:     "auto",
    locale:       "ru-RU",
    start_url:    "https://google.com"
  };

  // Apply manual overrides
  if (overrides) {
    if (overrides.user_agent) fp.user_agent = overrides.user_agent;
    if (overrides.hardware) {
      if (overrides.hardware.concurrency) fp.hardware.concurrency = parseInt(overrides.hardware.concurrency);
      if (overrides.hardware.memory) fp.hardware.memory = parseInt(overrides.hardware.memory);
    }
    if (overrides.screen) {
      if (overrides.screen.width) fp.screen.width = parseInt(overrides.screen.width);
      if (overrides.screen.height) fp.screen.height = parseInt(overrides.screen.height);
      if (overrides.screen.pixel_ratio) fp.screen.pixel_ratio = parseFloat(overrides.screen.pixel_ratio);
    }
    if (overrides.webgl) {
      if (overrides.webgl.unmasked_renderer) {
        fp.webgl.unmasked_renderer = overrides.webgl.unmasked_renderer;
        fp.webgl.renderer = overrides.webgl.unmasked_renderer;
      }
      if (overrides.webgl.unmasked_vendor) {
        fp.webgl.unmasked_vendor = overrides.webgl.unmasked_vendor;
        fp.webgl.vendor = overrides.webgl.unmasked_vendor;
      }
    }
    if (overrides.timezone) fp.timezone = overrides.timezone;
    if (overrides.locale) fp.locale = overrides.locale;
    if (overrides.webrtc_mode) fp.webrtc_mode = overrides.webrtc_mode;
    if (overrides.start_url) fp.start_url = overrides.start_url;
    if (overrides.canvas_noise !== undefined) fp.canvas_noise = overrides.canvas_noise;
    if (overrides.audio_noise !== undefined) fp.audio_noise = overrides.audio_noise;
  }

  return fp;
}

module.exports = {
  generateFingerprint,
  GPU_PROFILES,
  RESOLUTIONS,
  CPU_CORES_LIST,
  RAM_LIST,
  TIMEZONES,
  LOCALES,
  WEBRTC_MODES,
  UA_PRESETS
};
