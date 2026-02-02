// 幻翼生成控制脚本
// 用于降低幻翼的生成频率，减少玩家困扰

/**
 * 配置说明：
 * - cancelChance: 取消幻翼生成的概率 (0.0 - 1.0)
 *   0.0 = 不取消任何生成（原版行为）
 *   0.5 = 取消 50% 的生成
 *   0.8 = 取消 80% 的生成（大幅减少）
 *   0.9 = 取消 90% 的生成
 *   1.0 = 完全禁止生成
 */
const PHANTOM_CONFIG = {
    cancelChance: 0.3,  // 默认取消 30% 的生成，可根据需要调整
    enableLog: false    // 是否启用日志输出（调试用）
}

console.info('═══════════════════════════════════════════════════════')
console.info('👻 幻翼生成控制系统 V1.0')
console.info('🎯  目标生物: minecraft:phantom')
console.info(`📊  取消概率: ${(PHANTOM_CONFIG.cancelChance * 100).toFixed(0)}% (保留 ${(100 - PHANTOM_CONFIG.cancelChance * 100).toFixed(0)}%)`)
console.info(`📝  调试日志: ${PHANTOM_CONFIG.enableLog ? '✅ 已启用' : '❌ 已禁用'}`)
if (PHANTOM_CONFIG.cancelChance === 0) {
    console.info('⚠️  警告: 当前配置不会取消任何生成（原版行为）')
} else if (PHANTOM_CONFIG.cancelChance === 1) {
    console.info('🚫  警告: 当前配置将完全禁止幻翼生成！')
} else if (PHANTOM_CONFIG.cancelChance >= 0.8) {
    console.info('💤  效果: 大幅减少幻翼生成，玩家可安心睡觉')
} else if (PHANTOM_CONFIG.cancelChance >= 0.5) {
    console.info('😴  效果: 适度减少幻翼生成')
} else {
    console.info('🌙  效果: 轻微减少幻翼生成')
}
console.info('✅  状态: 已成功加载')
console.info('═══════════════════════════════════════════════════════')

EntityEvents.spawned('minecraft:phantom', event => {
    // 随机判断是否取消生成
    if (Math.random() < PHANTOM_CONFIG.cancelChance) {
        event.cancel()
        
        if (PHANTOM_CONFIG.enableLog) {
            console.log('[幻翼控制] 已取消一次幻翼生成')
        }
    }
})
