/**
 * Program IDL in camelCase format in order to be used in JS/TS.
 *
 * Note that this is only a type helper and is not the actual IDL. The original
 * IDL can be found at `target/idl/perpetuals.json`.
 */
export type Perpetuals = {
  "address": "F5SxeR2fW3R23GVCBSicwk45Zn9nhDCgSPHXirm2Vsom",
  "metadata": {
    "name": "perpetuals",
    "version": "0.1.0",
    "spec": "0.1.0",
    "description": "Created with Anchor"
  },
  "instructions": [
    {
      "name": "addCustody",
      "discriminator": [
        247,
        254,
        126,
        17,
        26,
        6,
        215,
        117
      ],
      "accounts": [
        {
          "name": "authority",
          "writable": true,
          "signer": true
        },
        {
          "name": "custody",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  99,
                  117,
                  115,
                  116,
                  111,
                  100,
                  121
                ]
              },
              {
                "kind": "account",
                "path": "pool"
              },
              {
                "kind": "account",
                "path": "custodyTokenMint"
              }
            ]
          }
        },
        {
          "name": "custodyTokenMint"
        },
        {
          "name": "pool",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  112,
                  111,
                  111,
                  108
                ]
              },
              {
                "kind": "account",
                "path": "pool.name",
                "account": "pool"
              }
            ]
          }
        },
        {
          "name": "perpetuals",
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  112,
                  101,
                  114,
                  112,
                  101,
                  116,
                  117,
                  97,
                  108,
                  115
                ]
              }
            ]
          }
        },
        {
          "name": "custodyTokenAccount",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  99,
                  117,
                  115,
                  116,
                  111,
                  100,
                  121,
                  95,
                  116,
                  111,
                  107,
                  101,
                  110,
                  95,
                  97,
                  99,
                  99,
                  111,
                  117,
                  110,
                  116
                ]
              },
              {
                "kind": "account",
                "path": "pool"
              },
              {
                "kind": "account",
                "path": "custodyTokenMint"
              }
            ]
          }
        },
        {
          "name": "systemProgram",
          "address": "11111111111111111111111111111111"
        },
        {
          "name": "tokenProgram",
          "address": "TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA"
        }
      ],
      "args": [
        {
          "name": "isStable",
          "type": "bool"
        },
        {
          "name": "oracleType",
          "type": {
            "defined": {
              "name": "oracleType"
            }
          }
        },
        {
          "name": "initialPrice",
          "type": "u64"
        }
      ]
    },
    {
      "name": "addLiquidity",
      "discriminator": [
        181,
        157,
        89,
        67,
        143,
        182,
        52,
        72
      ],
      "accounts": [
        {
          "name": "owner",
          "writable": true,
          "signer": true
        },
        {
          "name": "perpetuals",
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  112,
                  101,
                  114,
                  112,
                  101,
                  116,
                  117,
                  97,
                  108,
                  115
                ]
              }
            ]
          }
        },
        {
          "name": "pool",
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  112,
                  111,
                  111,
                  108
                ]
              },
              {
                "kind": "account",
                "path": "pool.name",
                "account": "pool"
              }
            ]
          }
        },
        {
          "name": "custody",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  99,
                  117,
                  115,
                  116,
                  111,
                  100,
                  121
                ]
              },
              {
                "kind": "account",
                "path": "pool"
              },
              {
                "kind": "account",
                "path": "custodyTokenMint"
              }
            ]
          }
        },
        {
          "name": "custodyTokenMint"
        },
        {
          "name": "lpTokenMint",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  108,
                  112,
                  95,
                  116,
                  111,
                  107,
                  101,
                  110,
                  95,
                  109,
                  105,
                  110,
                  116
                ]
              },
              {
                "kind": "account",
                "path": "pool"
              }
            ]
          }
        },
        {
          "name": "fundingAccount",
          "writable": true
        },
        {
          "name": "lpTokenAccount",
          "writable": true
        },
        {
          "name": "custodyTokenAccount",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  99,
                  117,
                  115,
                  116,
                  111,
                  100,
                  121,
                  95,
                  116,
                  111,
                  107,
                  101,
                  110,
                  95,
                  97,
                  99,
                  99,
                  111,
                  117,
                  110,
                  116
                ]
              },
              {
                "kind": "account",
                "path": "pool"
              },
              {
                "kind": "account",
                "path": "custodyTokenMint"
              }
            ]
          }
        },
        {
          "name": "tokenProgram",
          "address": "TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA"
        }
      ],
      "args": [
        {
          "name": "amountIn",
          "type": "u64"
        },
        {
          "name": "minLpAmountOut",
          "type": "u64"
        }
      ]
    },
    {
      "name": "addPool",
      "discriminator": [
        115,
        230,
        212,
        211,
        175,
        49,
        39,
        169
      ],
      "accounts": [
        {
          "name": "authority",
          "writable": true,
          "signer": true
        },
        {
          "name": "pool",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  112,
                  111,
                  111,
                  108
                ]
              },
              {
                "kind": "arg",
                "path": "name"
              }
            ]
          }
        },
        {
          "name": "lpTokenMint",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  108,
                  112,
                  95,
                  116,
                  111,
                  107,
                  101,
                  110,
                  95,
                  109,
                  105,
                  110,
                  116
                ]
              },
              {
                "kind": "account",
                "path": "pool"
              }
            ]
          }
        },
        {
          "name": "perpetuals",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  112,
                  101,
                  114,
                  112,
                  101,
                  116,
                  117,
                  97,
                  108,
                  115
                ]
              }
            ]
          }
        },
        {
          "name": "tokenProgram",
          "address": "TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA"
        },
        {
          "name": "systemProgram",
          "address": "11111111111111111111111111111111"
        }
      ],
      "args": [
        {
          "name": "name",
          "type": "string"
        }
      ]
    },
    {
      "name": "closePosition",
      "discriminator": [
        123,
        134,
        81,
        0,
        49,
        68,
        98,
        98
      ],
      "accounts": [
        {
          "name": "owner",
          "writable": true,
          "signer": true,
          "relations": [
            "position"
          ]
        },
        {
          "name": "position",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  112,
                  111,
                  115,
                  105,
                  116,
                  105,
                  111,
                  110
                ]
              },
              {
                "kind": "account",
                "path": "owner"
              },
              {
                "kind": "account",
                "path": "pool"
              },
              {
                "kind": "account",
                "path": "custody"
              }
            ]
          }
        },
        {
          "name": "perpetuals",
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  112,
                  101,
                  114,
                  112,
                  101,
                  116,
                  117,
                  97,
                  108,
                  115
                ]
              }
            ]
          }
        },
        {
          "name": "pool",
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  112,
                  111,
                  111,
                  108
                ]
              },
              {
                "kind": "account",
                "path": "pool.name",
                "account": "pool"
              }
            ]
          }
        },
        {
          "name": "custody",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  99,
                  117,
                  115,
                  116,
                  111,
                  100,
                  121
                ]
              },
              {
                "kind": "account",
                "path": "pool"
              },
              {
                "kind": "account",
                "path": "mint"
              }
            ]
          }
        },
        {
          "name": "mint"
        },
        {
          "name": "custodyTokenAccount",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  99,
                  117,
                  115,
                  116,
                  111,
                  100,
                  121,
                  95,
                  116,
                  111,
                  107,
                  101,
                  110,
                  95,
                  97,
                  99,
                  99,
                  111,
                  117,
                  110,
                  116
                ]
              },
              {
                "kind": "account",
                "path": "pool"
              },
              {
                "kind": "account",
                "path": "mint"
              }
            ]
          }
        },
        {
          "name": "oracleAccount"
        }
      ],
      "args": []
    },
    {
      "name": "initialize",
      "discriminator": [
        175,
        175,
        109,
        31,
        13,
        152,
        155,
        237
      ],
      "accounts": [
        {
          "name": "admin",
          "writable": true,
          "signer": true
        },
        {
          "name": "perpetuals",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  112,
                  101,
                  114,
                  112,
                  101,
                  116,
                  117,
                  97,
                  108,
                  115
                ]
              }
            ]
          }
        },
        {
          "name": "systemProgram",
          "address": "11111111111111111111111111111111"
        }
      ],
      "args": [
        {
          "name": "minSignatures",
          "type": "u8"
        },
        {
          "name": "admins",
          "type": {
            "vec": "pubkey"
          }
        }
      ]
    },
    {
      "name": "liquidatePosition",
      "discriminator": [
        187,
        74,
        229,
        149,
        102,
        81,
        221,
        68
      ],
      "accounts": [
        {
          "name": "liquidator",
          "writable": true,
          "signer": true
        },
        {
          "name": "positionOwner",
          "writable": true
        },
        {
          "name": "position",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  112,
                  111,
                  115,
                  105,
                  116,
                  105,
                  111,
                  110
                ]
              },
              {
                "kind": "account",
                "path": "position.owner",
                "account": "position"
              },
              {
                "kind": "account",
                "path": "pool"
              },
              {
                "kind": "account",
                "path": "custody"
              }
            ]
          }
        },
        {
          "name": "pool",
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  112,
                  111,
                  111,
                  108
                ]
              },
              {
                "kind": "account",
                "path": "pool.name",
                "account": "pool"
              }
            ]
          }
        },
        {
          "name": "custody",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  99,
                  117,
                  115,
                  116,
                  111,
                  100,
                  121
                ]
              },
              {
                "kind": "account",
                "path": "pool"
              },
              {
                "kind": "account",
                "path": "mint"
              }
            ]
          }
        },
        {
          "name": "mint"
        },
        {
          "name": "custodyTokenAccount",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  99,
                  117,
                  115,
                  116,
                  111,
                  100,
                  121,
                  95,
                  116,
                  111,
                  107,
                  101,
                  110,
                  95,
                  97,
                  99,
                  99,
                  111,
                  117,
                  110,
                  116
                ]
              },
              {
                "kind": "account",
                "path": "pool"
              },
              {
                "kind": "account",
                "path": "mint"
              }
            ]
          }
        },
        {
          "name": "oracleAccount"
        }
      ],
      "args": []
    },
    {
      "name": "openPosition",
      "discriminator": [
        135,
        128,
        47,
        77,
        15,
        152,
        240,
        49
      ],
      "accounts": [
        {
          "name": "owner",
          "writable": true,
          "signer": true
        },
        {
          "name": "position",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  112,
                  111,
                  115,
                  105,
                  116,
                  105,
                  111,
                  110
                ]
              },
              {
                "kind": "account",
                "path": "owner"
              },
              {
                "kind": "account",
                "path": "pool"
              },
              {
                "kind": "account",
                "path": "custody"
              }
            ]
          }
        },
        {
          "name": "perpetuals",
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  112,
                  101,
                  114,
                  112,
                  101,
                  116,
                  117,
                  97,
                  108,
                  115
                ]
              }
            ]
          }
        },
        {
          "name": "pool",
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  112,
                  111,
                  111,
                  108
                ]
              },
              {
                "kind": "account",
                "path": "pool.name",
                "account": "pool"
              }
            ]
          }
        },
        {
          "name": "custody",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  99,
                  117,
                  115,
                  116,
                  111,
                  100,
                  121
                ]
              },
              {
                "kind": "account",
                "path": "pool"
              },
              {
                "kind": "account",
                "path": "mint"
              }
            ]
          }
        },
        {
          "name": "mint"
        },
        {
          "name": "custodyTokenAccount",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  99,
                  117,
                  115,
                  116,
                  111,
                  100,
                  121,
                  95,
                  116,
                  111,
                  107,
                  101,
                  110,
                  95,
                  97,
                  99,
                  99,
                  111,
                  117,
                  110,
                  116
                ]
              },
              {
                "kind": "account",
                "path": "pool"
              },
              {
                "kind": "account",
                "path": "mint"
              }
            ]
          }
        },
        {
          "name": "oracleAccount"
        },
        {
          "name": "systemProgram",
          "address": "11111111111111111111111111111111"
        }
      ],
      "args": [
        {
          "name": "side",
          "type": {
            "defined": {
              "name": "side"
            }
          }
        },
        {
          "name": "collateralAmount",
          "type": "u64"
        },
        {
          "name": "leverage",
          "type": "u64"
        },
        {
          "name": "acceptablePrice",
          "type": "u64"
        }
      ]
    },
    {
      "name": "removeLiquidity",
      "discriminator": [
        80,
        85,
        209,
        72,
        24,
        206,
        177,
        108
      ],
      "accounts": [
        {
          "name": "owner",
          "writable": true,
          "signer": true
        },
        {
          "name": "perpetuals",
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  112,
                  101,
                  114,
                  112,
                  101,
                  116,
                  117,
                  97,
                  108,
                  115
                ]
              }
            ]
          }
        },
        {
          "name": "pool",
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  112,
                  111,
                  111,
                  108
                ]
              },
              {
                "kind": "account",
                "path": "pool.name",
                "account": "pool"
              }
            ]
          }
        },
        {
          "name": "custody",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  99,
                  117,
                  115,
                  116,
                  111,
                  100,
                  121
                ]
              },
              {
                "kind": "account",
                "path": "pool"
              },
              {
                "kind": "account",
                "path": "custodyTokenMint"
              }
            ]
          }
        },
        {
          "name": "custodyTokenMint"
        },
        {
          "name": "lpTokenMint",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  108,
                  112,
                  95,
                  116,
                  111,
                  107,
                  101,
                  110,
                  95,
                  109,
                  105,
                  110,
                  116
                ]
              },
              {
                "kind": "account",
                "path": "pool"
              }
            ]
          }
        },
        {
          "name": "lpTokenAccount",
          "writable": true
        },
        {
          "name": "receivingAccount",
          "writable": true
        },
        {
          "name": "custodyTokenAccount",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  99,
                  117,
                  115,
                  116,
                  111,
                  100,
                  121,
                  95,
                  116,
                  111,
                  107,
                  101,
                  110,
                  95,
                  97,
                  99,
                  99,
                  111,
                  117,
                  110,
                  116
                ]
              },
              {
                "kind": "account",
                "path": "pool"
              },
              {
                "kind": "account",
                "path": "custodyTokenMint"
              }
            ]
          }
        },
        {
          "name": "tokenProgram",
          "address": "TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA"
        }
      ],
      "args": [
        {
          "name": "lpAmountIn",
          "type": "u64"
        },
        {
          "name": "minAmountOut",
          "type": "u64"
        }
      ]
    },
    {
      "name": "updatePosition",
      "discriminator": [
        102,
        75,
        42,
        126,
        57,
        196,
        156,
        9
      ],
      "accounts": [
        {
          "name": "position",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  112,
                  111,
                  115,
                  105,
                  116,
                  105,
                  111,
                  110
                ]
              },
              {
                "kind": "account",
                "path": "position.owner",
                "account": "position"
              },
              {
                "kind": "account",
                "path": "pool"
              },
              {
                "kind": "account",
                "path": "custody"
              }
            ]
          }
        },
        {
          "name": "pool",
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  112,
                  111,
                  111,
                  108
                ]
              },
              {
                "kind": "account",
                "path": "pool.name",
                "account": "pool"
              }
            ]
          }
        },
        {
          "name": "custody",
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  99,
                  117,
                  115,
                  116,
                  111,
                  100,
                  121
                ]
              },
              {
                "kind": "account",
                "path": "pool"
              },
              {
                "kind": "account",
                "path": "mint"
              }
            ]
          }
        },
        {
          "name": "mint"
        },
        {
          "name": "oracleAccount"
        }
      ],
      "args": []
    },
    {
      "name": "updatePrice",
      "discriminator": [
        61,
        34,
        117,
        155,
        75,
        34,
        123,
        208
      ],
      "accounts": [
        {
          "name": "authority",
          "writable": true,
          "signer": true
        },
        {
          "name": "custody",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  99,
                  117,
                  115,
                  116,
                  111,
                  100,
                  121
                ]
              },
              {
                "kind": "account",
                "path": "pool"
              },
              {
                "kind": "account",
                "path": "mint"
              }
            ]
          }
        },
        {
          "name": "pool",
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  112,
                  111,
                  111,
                  108
                ]
              },
              {
                "kind": "account",
                "path": "pool.name",
                "account": "pool"
              }
            ]
          }
        },
        {
          "name": "mint"
        },
        {
          "name": "perpetuals",
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  112,
                  101,
                  114,
                  112,
                  101,
                  116,
                  117,
                  97,
                  108,
                  115
                ]
              }
            ]
          }
        }
      ],
      "args": [
        {
          "name": "newPrice",
          "type": "u64"
        }
      ]
    }
  ],
  "accounts": [
    {
      "name": "custody",
      "discriminator": [
        1,
        184,
        48,
        81,
        93,
        131,
        63,
        145
      ]
    },
    {
      "name": "perpetuals",
      "discriminator": [
        28,
        167,
        98,
        191,
        104,
        82,
        108,
        196
      ]
    },
    {
      "name": "pool",
      "discriminator": [
        241,
        154,
        109,
        4,
        17,
        177,
        109,
        188
      ]
    },
    {
      "name": "position",
      "discriminator": [
        170,
        188,
        143,
        228,
        122,
        64,
        247,
        208
      ]
    }
  ],
  "errors": [
    {
      "code": 6000,
      "name": "invalidPrice",
      "msg": "Invalid price"
    },
    {
      "code": 6001,
      "name": "invalidPoolName",
      "msg": "Invalid pool name"
    },
    {
      "code": 6002,
      "name": "invalidOraclePrice",
      "msg": "Invalid oracle price"
    },
    {
      "code": 6003,
      "name": "priceTooOld",
      "msg": "Price too old"
    },
    {
      "code": 6004,
      "name": "mathOverflow",
      "msg": "Math overflow"
    },
    {
      "code": 6005,
      "name": "invalidLeverage",
      "msg": "Invalid leverage"
    },
    {
      "code": 6006,
      "name": "invalidCollateralAmount",
      "msg": "Invalid collateral amount"
    },
    {
      "code": 6007,
      "name": "positionNotLiquidatable",
      "msg": "Position not liquidatable"
    },
    {
      "code": 6008,
      "name": "priceSlippageExceeded",
      "msg": "Price slippage exceeded"
    },
    {
      "code": 6009,
      "name": "invalidAmount",
      "msg": "Invalid amount"
    },
    {
      "code": 6010,
      "name": "actionNotAllowed",
      "msg": "Action not allowed"
    },
    {
      "code": 6011,
      "name": "slippageExceeded",
      "msg": "Slippage exceeded"
    },
    {
      "code": 6012,
      "name": "insufficientLiquidity",
      "msg": "Insufficient liquidity"
    }
  ],
  "types": [
    {
      "name": "assets",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "collateral",
            "type": "u64"
          },
          {
            "name": "protocolFees",
            "type": "u64"
          },
          {
            "name": "owned",
            "type": "u64"
          },
          {
            "name": "locked",
            "type": "u64"
          }
        ]
      }
    },
    {
      "name": "borrowRateParams",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "baseRate",
            "type": "u64"
          },
          {
            "name": "slope1",
            "type": "u64"
          },
          {
            "name": "slope2",
            "type": "u64"
          },
          {
            "name": "optimalUtilization",
            "type": "u64"
          }
        ]
      }
    },
    {
      "name": "custody",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "pool",
            "type": "pubkey"
          },
          {
            "name": "mint",
            "type": "pubkey"
          },
          {
            "name": "decimals",
            "type": "u8"
          },
          {
            "name": "isStable",
            "type": "bool"
          },
          {
            "name": "oracle",
            "type": "pubkey"
          },
          {
            "name": "oracleType",
            "type": {
              "defined": {
                "name": "oracleType"
              }
            }
          },
          {
            "name": "pricing",
            "type": {
              "defined": {
                "name": "pricingParams"
              }
            }
          },
          {
            "name": "fees",
            "type": {
              "defined": {
                "name": "fees"
              }
            }
          },
          {
            "name": "borrowRate",
            "type": {
              "defined": {
                "name": "borrowRateParams"
              }
            }
          },
          {
            "name": "assets",
            "type": {
              "defined": {
                "name": "assets"
              }
            }
          },
          {
            "name": "volumeStats",
            "type": {
              "defined": {
                "name": "volumeStats"
              }
            }
          },
          {
            "name": "tradeStats",
            "type": {
              "defined": {
                "name": "tradeStats"
              }
            }
          },
          {
            "name": "feedId",
            "type": {
              "option": "string"
            }
          },
          {
            "name": "bump",
            "type": "u8"
          },
          {
            "name": "tokenAccountBump",
            "type": "u8"
          }
        ]
      }
    },
    {
      "name": "fees",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "swapIn",
            "type": "u64"
          },
          {
            "name": "swapOut",
            "type": "u64"
          },
          {
            "name": "stableSwapIn",
            "type": "u64"
          },
          {
            "name": "stableSwapOut",
            "type": "u64"
          },
          {
            "name": "addLiquidity",
            "type": "u64"
          },
          {
            "name": "removeLiquidity",
            "type": "u64"
          },
          {
            "name": "openPosition",
            "type": "u64"
          },
          {
            "name": "closePosition",
            "type": "u64"
          },
          {
            "name": "liquidation",
            "type": "u64"
          },
          {
            "name": "protocolShare",
            "type": "u64"
          }
        ]
      }
    },
    {
      "name": "oracleType",
      "type": {
        "kind": "enum",
        "variants": [
          {
            "name": "pyth"
          },
          {
            "name": "custom"
          },
          {
            "name": "none"
          }
        ]
      }
    },
    {
      "name": "permissions",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "allowSwap",
            "type": "bool"
          },
          {
            "name": "allowAddLiquidity",
            "type": "bool"
          },
          {
            "name": "allowRemoveLiquidity",
            "type": "bool"
          },
          {
            "name": "allowOpenPosition",
            "type": "bool"
          },
          {
            "name": "allowClosePosition",
            "type": "bool"
          },
          {
            "name": "allowPnlWithdrawal",
            "type": "bool"
          },
          {
            "name": "allowCollateralWithdrawal",
            "type": "bool"
          },
          {
            "name": "allowSizeChange",
            "type": "bool"
          }
        ]
      }
    },
    {
      "name": "perpetuals",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "adminAuthority",
            "type": "pubkey"
          },
          {
            "name": "minSignatures",
            "type": "u8"
          },
          {
            "name": "admins",
            "type": {
              "vec": "pubkey"
            }
          },
          {
            "name": "pools",
            "type": {
              "vec": "pubkey"
            }
          },
          {
            "name": "permissions",
            "type": {
              "defined": {
                "name": "permissions"
              }
            }
          },
          {
            "name": "bump",
            "type": "u8"
          }
        ]
      }
    },
    {
      "name": "pool",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "name",
            "type": "string"
          },
          {
            "name": "custodies",
            "type": {
              "vec": "pubkey"
            }
          },
          {
            "name": "aumUsd",
            "type": "u64"
          },
          {
            "name": "bump",
            "type": "u8"
          },
          {
            "name": "lpTokenBump",
            "type": "u8"
          },
          {
            "name": "inceptionTime",
            "type": "i64"
          }
        ]
      }
    },
    {
      "name": "position",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "owner",
            "type": "pubkey"
          },
          {
            "name": "pool",
            "type": "pubkey"
          },
          {
            "name": "custody",
            "type": "pubkey"
          },
          {
            "name": "side",
            "type": {
              "defined": {
                "name": "side"
              }
            }
          },
          {
            "name": "collateralAmount",
            "type": "u64"
          },
          {
            "name": "leverage",
            "type": "u64"
          },
          {
            "name": "sizeUsd",
            "type": "u64"
          },
          {
            "name": "entryPrice",
            "type": "u64"
          },
          {
            "name": "entryTimestamp",
            "type": "i64"
          },
          {
            "name": "unrealizedPnl",
            "type": "i64"
          },
          {
            "name": "bump",
            "type": "u8"
          }
        ]
      }
    },
    {
      "name": "pricingParams",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "useEma",
            "type": "bool"
          },
          {
            "name": "useUnrealizedPnlInAum",
            "type": "bool"
          },
          {
            "name": "tradeSpreadLong",
            "type": "u64"
          },
          {
            "name": "tradeSpreadShort",
            "type": "u64"
          },
          {
            "name": "swapSpread",
            "type": "u64"
          },
          {
            "name": "maxLeverage",
            "type": "u64"
          },
          {
            "name": "maxGlobalShortSizeUsd",
            "type": "u64"
          },
          {
            "name": "maxGlobalLongSizeUsd",
            "type": "u64"
          },
          {
            "name": "currentPrice",
            "type": "u64"
          },
          {
            "name": "emaPrice",
            "type": "u64"
          },
          {
            "name": "lastUpdateTime",
            "type": "i64"
          }
        ]
      }
    },
    {
      "name": "side",
      "type": {
        "kind": "enum",
        "variants": [
          {
            "name": "long"
          },
          {
            "name": "short"
          }
        ]
      }
    },
    {
      "name": "tradeStats",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "oiLongUsd",
            "type": "u64"
          },
          {
            "name": "oiShortUsd",
            "type": "u64"
          },
          {
            "name": "totalLongFunding",
            "type": "i64"
          },
          {
            "name": "totalShortFunding",
            "type": "i64"
          }
        ]
      }
    },
    {
      "name": "volumeStats",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "swapUsd",
            "type": "u128"
          },
          {
            "name": "addLiquidityUsd",
            "type": "u128"
          },
          {
            "name": "removeLiquidityUsd",
            "type": "u128"
          },
          {
            "name": "openPositionUsd",
            "type": "u128"
          },
          {
            "name": "closePositionUsd",
            "type": "u128"
          },
          {
            "name": "liquidationUsd",
            "type": "u128"
          }
        ]
      }
    }
  ]
};
