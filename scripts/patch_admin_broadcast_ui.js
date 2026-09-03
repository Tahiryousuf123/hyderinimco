import fs from 'fs';

let content = fs.readFileSync('./scripts/build_luxury_theme.js', 'utf8');

const uiTarget = `                                <button
                                  type="button"
                                  onClick={handleToggleAiAutoReply}
                                  disabled={waTogglingAi}
                                  className={\`px-3.5 py-2 rounded-xl text-xs font-black transition-all shadow-md active:scale-95 shrink-0 \${
                                    waStatus.aiAutoReplyEnabled !== false
                                      ? 'bg-amber-500 hover:bg-amber-600 text-black border border-amber-300'
                                      : 'bg-emerald-500 hover:bg-emerald-600 text-white border border-emerald-300'
                                  }\`}
                                >
                                  {waTogglingAi 
                                    ? 'Updating...' 
                                    : (waStatus.aiAutoReplyEnabled !== false ? '⏸️ Turn AI OFF' : '▶️ Turn AI ON')}
                                </button>
                              </div>`;

const uiReplacement = uiTarget + `

                              {/* Automated 3-Hour AI Follow-Up Toggle Card */}
                              <div className="w-full bg-black/40 p-3 rounded-xl border border-goldBrand-400/30 flex items-center justify-between gap-3 mt-3">
                                <div className="text-left">
                                  <p className="text-xs font-black text-white flex items-center gap-1.5">
                                    <span>🤖 Auto 3-Hour AI Follow-Up:</span>
                                    <span className={\`px-2 py-0.5 rounded-full text-[10px] font-black \${
                                      waStatus.aiFollowUpEnabled !== false ? 'bg-emerald-400 text-emerald-950' : 'bg-amber-400 text-amber-950'
                                    }\`}>
                                      {waStatus.aiFollowUpEnabled !== false ? '🟢 ACTIVE (Auto-Puchhega)' : '⏸️ PAUSED'}
                                    </span>
                                  </p>
                                  <p className="text-[10px] text-gray-300 mt-0.5">
                                    Agar customer price puchne ke 3 ghante tak order na kare, to AI khud izzat se puchega ke order book karwana hai?
                                  </p>
                                </div>
                                <button
                                  type="button"
                                  onClick={handleToggleAiFollowUp}
                                  disabled={waTogglingFollowUp}
                                  className={\`px-3.5 py-2 rounded-xl text-xs font-black transition-all shadow-md active:scale-95 shrink-0 \${
                                    waStatus.aiFollowUpEnabled !== false
                                      ? 'bg-amber-500 hover:bg-amber-600 text-black border border-amber-300'
                                      : 'bg-emerald-500 hover:bg-emerald-600 text-white border border-emerald-300'
                                  }\`}
                                >
                                  {waTogglingFollowUp ? 'Updating...' : (waStatus.aiFollowUpEnabled !== false ? '⏸️ Pause Followup' : '▶️ Enable Followup')}
                                </button>
                              </div>

                              {/* WhatsApp Mass Broadcast / Deal Blast Section */}
                              <div className="w-full bg-parchment-50 text-gray-900 p-4 rounded-2xl border-2 border-goldBrand-400/60 mt-4 text-left space-y-3 shadow-md">
                                <div className="flex items-center justify-between border-b pb-2">
                                  <h4 className="font-black text-xs sm:text-sm text-emeraldBrand-950 flex items-center gap-2 font-serifBrand">
                                    <span>📢</span>
                                    <span>WhatsApp Mass Broadcast (تمام کسٹمرز کو میسج بھیجیں)</span>
                                  </h4>
                                  <span className="text-[10px] font-bold bg-emeraldBrand-900 text-goldBrand-200 px-2 py-0.5 rounded-md">DEAL BLAST</span>
                                </div>

                                <p className="text-[11px] text-gray-600">
                                  Jab bhi koi Nayi Deal ya Naya Item launch karna ho, yahan se ek sath tamam saved WhatsApp customers ko message bhejein:
                                </p>

                                {/* Template Buttons */}
                                <div className="flex flex-wrap gap-1.5">
                                  <button
                                    type="button"
                                    onClick={() => setBroadcastMsg(
                                      '🥟 *HYDERI NIMCO & FROZEN — NEW DEAL LAUNCH* 🔥\\n\\n' +
                                      'Assalam o Alaikum! 🥟\\n' +
                                      'Hyderi Nimco par 5 Nayi Super Saver Deals launch ho gayi hain! 🏷️\\n\\n' +
                                      '• Premium Deal 1: 12 BBQ Roll, 12 Malai Samosa, 6 Chapli Kabab...\\n\\n' +
                                      '🛍️ *Order Online:* https://hyderinimco-frozen.com\\n' +
                                      '📞 WhatsApp Hotline: 0336-2438422'
                                    )}
                                    className="px-2.5 py-1 bg-goldBrand-500/20 hover:bg-goldBrand-500/30 text-goldBrand-800 border border-goldBrand-400 rounded-lg text-[10px] font-bold cursor-pointer"
                                  >
                                    🔥 New Deal Template
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => setBroadcastMsg(
                                      '🛵 *HYDERI NIMCO — FREE EXPRESS DELIVERY TODAY* ✨\\n\\n' +
                                      'Assalam o Alaikum! 🥟\\n' +
                                      'Aaj tamam Karachi me Rs. 5,000+ ke orders par 100% FREE Delivery!\\n\\n' +
                                      '🛍️ *Order Online:* https://hyderinimco-frozen.com\\n' +
                                      '📍 North Nazimabad, Karachi'
                                    )}
                                    className="px-2.5 py-1 bg-emeraldBrand-900/10 hover:bg-emeraldBrand-900/20 text-emeraldBrand-950 border border-emeraldBrand-800/40 rounded-lg text-[10px] font-bold cursor-pointer"
                                  >
                                    🛵 Free Delivery Template
                                  </button>
                                </div>

                                <textarea
                                  rows={4}
                                  value={broadcastMsg}
                                  onChange={(e) => setBroadcastMsg(e.target.value)}
                                  className="w-full p-3 bg-white border border-gray-300 rounded-xl text-xs outline-none focus:border-emeraldBrand-800 font-sans"
                                  placeholder="Type promotional message to broadcast..."
                                />

                                {broadcastLog && (
                                  <div className="p-2.5 bg-black/80 text-goldBrand-300 rounded-xl text-[11px] font-mono leading-relaxed">
                                    {broadcastLog}
                                  </div>
                                )}

                                <button
                                  type="button"
                                  onClick={handleSendBroadcast}
                                  disabled={isSendingBroadcast || !broadcastMsg.trim()}
                                  className="w-full py-2.5 bg-gradient-to-r from-emeraldBrand-900 to-emeraldBrand-950 hover:from-emeraldBrand-800 hover:to-emeraldBrand-900 disabled:opacity-50 text-goldBrand-300 font-black rounded-xl text-xs shadow-md transition-all border border-goldBrand-400 flex items-center justify-center gap-2 cursor-pointer"
                                >
                                  <span>🚀</span>
                                  <span>{isSendingBroadcast ? '⏳ Sending Broadcast to All Customers...' : '📢 Send Broadcast to All Customers'}</span>
                                </button>
                              </div>`;

if (content.includes(uiTarget)) {
  content = content.replace(uiTarget, uiReplacement);
  console.log('SUCCESS: Added UI Cards for Broadcast and Follow-up!');
  fs.writeFileSync('./scripts/build_luxury_theme.js', content, 'utf8');
} else {
  console.error('ERROR: uiTarget not found');
}
