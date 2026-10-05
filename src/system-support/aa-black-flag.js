import { trafficCop }       from "../router/traffic-cop.js"
import AAHandler            from "../system-handlers/workflow-data.js"
import { getRequiredData }  from "./getRequiredData.js"
import { debug }            from "../constants/constants.js"

export function systemHooks() {
    Hooks.on("blackFlag.postRollAttack", async (rolls, data) => {
        if (!rolls?.length) return
        const activity = data.subject
        if (activity?.description?.chatFlavor?.includes("[noaa]")) return
        
        const item = activity?.item
        if (!item) return
        
        const overrideNames = activity?.name && !["heal", "summon"].includes(activity?.name?.trim()) ? [activity.name] : []
        
        const handler = await AAHandler.make(await getRequiredData({
            item,
            actor: item.parent,
            activity,
            roll: activity,
            overrideNames
        }))
        
        if (!handler?.item || !handler?.sourceToken) {
            debug("No Item or Source Token", handler)
            return
        }

        criticalCheckBlackFlag(rolls[0], item);
        
        trafficCop(handler)
    })
    
    Hooks.on("blackFlag.postCreateActivationMessage", async (activity, message) => {
        if (activity?.description?.chatFlavor?.includes("[noaa]")) return
        
        const item = activity?.item
        if (!item) return
        
        const overrideNames = activity?.name && !["heal", "summon"].includes(activity?.name?.trim()) ? [activity.name] : []
        
        const handler = await AAHandler.make(await getRequiredData({
            item,
            actor: item.parent,
            activity,
            roll: activity,
            workflow: message,
            overrideNames
        }))
        
        if (!handler?.item || !handler?.sourceToken) {
            debug("No Item or Source Token", handler)
            return
        }
        
        trafficCop(handler)
    })
    
    Hooks.on("createMeasuredTemplate", async (template, data, userId) => {
        if (userId !== game.user.id) return
        
        const activity = fromUuidSync(template.flags?.[game.system.id]?.origin) ?? null
        if (!activity) return
        
        if (activity?.description?.chatFlavor?.includes("[noaa]")) return
        
        const item = activity?.item
        if (!item) return
        
        const overrideNames = activity?.name && !["heal", "summon"].includes(activity?.name?.trim()) ? [activity.name] : []
        
        const handler = await AAHandler.make(await getRequiredData({
            item,
            actor: item.parent,
            activity,
            templateData: template,
            roll: activity,
            isTemplate: true,
            overrideNames
        }))
        
        if (!handler?.item || !handler?.sourceToken) {
            debug("No Item or Source Token", handler)
            return
        }
        
        trafficCop(handler)
    })
}

function criticalCheckBlackFlag(roll, item = {}) {
    if (!roll?.isCriticalSuccess && !roll?.isCriticalFailure) { return; }
    debug("Checking for Crit or Fumble")
    const critical = roll?.isCriticalSuccess;
    const fumble = roll?.isCriticalFailure;
    const token = canvas.tokens.get(roll.tokenId) || getTokenFromItem(item);

    const critAnim = game.settings.get("autoanimations", "CriticalAnimation");
    const critMissAnim = game.settings.get("autoanimations", "CriticalMissAnimation");

    switch (true) {
        case (game.settings.get("autoanimations", "EnableCritical") && critical):
            new Sequence({moduleName: "Automated Animations", softFail: !game.settings.get("autoanimations", "debug")})
                .effect()
                .file(critAnim)
                .atLocation(token)
                .play()
            break;
        case (game.settings.get("autoanimations", "EnableCriticalMiss") && fumble):
            new Sequence({moduleName: "Automated Animations", softFail: !game.settings.get("autoanimations", "debug")})
                .effect()
                .file(critMissAnim)
                .atLocation(token)
                .play()
            break;
    }

    function getTokenFromItem(item) {
        const token = item?.parent?.token;
        if (token) return token;
        const tokens = canvas.tokens.placeables.filter(token => token.actor?.items?.get(item.id));
        const fallBack = tokens[0];
        const mostLikely = tokens.find(x => x.id === _token.id);
        return mostLikely ?? fallBack;
    }

}
