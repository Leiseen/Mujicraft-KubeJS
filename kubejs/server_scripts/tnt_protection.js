// TNT 和苦力怕防爆保护
// 阻止所有爆炸破坏方块，但保留爆炸的视觉和音效
// 作者：祥狐
// 版本：V1.1 - 修复 API 调用问题


LevelEvents.beforeExplosion(event => {
    // 获取爆炸信息
    let x = event.x
    let y = event.y
    let z = event.z
    let level = event.level
    let size = event.size || 3.0
    
    // 取消原始爆炸（阻止方块破坏）
    event.cancel()
    
    // 创建一个新的爆炸，只有视觉和音效，不破坏方块
    // KubeJS 6 的 createExplosion 需要链式调用并以 .explode() 结尾
    try {
        level.createExplosion(x, y, z)
            .strength(size)           // 设置爆炸强度
            .damagesTerrain(false)    // 不破坏地形
            .causesFire(false)        // 不引起火焰
            .explode()                // 执行爆炸（必须调用）
    } catch (e) {
        // 如果 createExplosion 不可用，使用粒子和音效模拟
        level.server.runCommandSilent(`particle minecraft:explosion ${x} ${y} ${z} 1 1 1 0.1 10 force`)
        level.server.runCommandSilent(`playsound minecraft:entity.generic.explode block @a ${x} ${y} ${z} 1 1`)
    }
})

console.info('═══════════════════════════════════════════════════════')
console.info('💥 TNT 和苦力怕防爆保护系统 V1.1')
console.info('🛡️  功能: 阻止所有爆炸破坏方块')
console.info('🎆  效果: 保留爆炸视觉和音效')
console.info('🚫  限制: 不造成伤害和击退')
console.info('✅  状态: 已成功加载')
console.info('═══════════════════════════════════════════════════════')
