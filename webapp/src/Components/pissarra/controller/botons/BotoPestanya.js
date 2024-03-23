import { useEffect } from "react";
import { useState } from "react";
import Pressable from "../../../other/Pressable";

function BotoPestanya({ full, disabled, tabs, pestanya, setPestanya }) {
    const loopToNextTab = (prevTab) => {
        const idxPrev = tabs.indexOf(prevTab);
        if (idxPrev === -1) return;

        const nextTab = tabs[(idxPrev + 1) % tabs?.length];
        setPestanya(nextTab);
    }

    const theresReforcos = ['Folre', 'Manilles', 'Puntals']
        .map(reforc => tabs.map(t => t.toLowerCase()).includes(reforc.toLowerCase()))
        .some(bool => bool)

    const modPestanyes = tabs
        .map(tab => theresReforcos && tab.toLowerCase() === 'pinya' ? 'soca' : tab)
        .map(tab => tab.toUpperCase())

    const modPestanya = modPestanyes
        .find((tab, idx) => idx === tabs.map(t => t.toLowerCase()).indexOf(pestanya.toLowerCase()))

    return (
        <Pressable
            onClick={() => loopToNextTab(pestanya)}
            className={`boto boto-pestanya ${disabled ? 'disabled' : ''}`}
            style={{
                backgroundColor: 'rgba(234, 0, 255, 0.2)'
            }}
        >
            <div>
                {
                    full ? modPestanya :
                    (modPestanya?.[0] || 'P')
                }
            </div>
        </Pressable>
    )
}

export default BotoPestanya;