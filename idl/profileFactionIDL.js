var profileFactionIDL = (function(exports) {
    'use strict';
    return  exports =
        {
            version: "0.7.1",
            name: "profile_faction",
            instructions: [{
                name: "chooseFaction",
                accounts: [{
                    name: "key",
                    isMut: !1,
                    isSigner: !0,
                    docs: ["The key with auth permissions."]
                }, {name: "funder", isMut: !0, isSigner: !0, docs: ["The funder for the transaction."]}, {
                    name: "profile",
                    isMut: !1,
                    isSigner: !1,
                    docs: ["The profile to change faction for."]
                }, {name: "faction", isMut: !0, isSigner: !1, docs: ["The faction to change to."]}, {
                    name: "systemProgram",
                    isMut: !1,
                    isSigner: !1,
                    docs: ["The system program."]
                }],
                args: [{name: "keyIndex", type: "u16"}, {name: "faction", type: {defined: "Faction"}}]
            }],
            accounts: [{
                name: "profileFactionAccount",
                docs: ["Stores a profiles enlisted faction on-chain."],
                type: {
                    kind: "struct",
                    fields: [{name: "version", docs: ["The data version of this account."], type: "u8"}, {
                        name: "profile",
                        docs: ["The profile this faction enlistment is for."],
                        type: "publicKey"
                    }, {name: "faction", docs: ["The faction of the profile."], type: "u8"}, {
                        name: "bump",
                        docs: ["The bump for this account."],
                        type: "u8"
                    }]
                }
            }],
            types: [{
                name: "Faction",
                docs: ["A faction that a player can belong to."],
                type: {kind: "enum", variants: [{name: "Unaligned"}, {name: "MUD"}, {name: "ONI"}, {name: "Ustur"}]}
            }]
        };
}({}));
