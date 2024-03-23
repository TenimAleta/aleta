import { useEffect } from "react";
import { useState } from "react";
import Pressable from "../../../other/Pressable";

function BotoPestanyaDown({ show=true, readonly, full, disabled, tabs, pestanya, setPestanya }) {
    const loopToPrevTab = (prevTab) => {
        const idxPrev = tabs.indexOf(prevTab);
        if (idxPrev === -1) return;

        const nextTab = tabs[(idxPrev - 1 + tabs.length) % tabs?.length];
        setPestanya(nextTab);
    }

    const theresReforcos = ['Folre', 'Manilles', 'Puntals']
        .map(reforc => tabs?.map(t => t.toLowerCase()).includes(reforc.toLowerCase()))
        .some(bool => bool)

    const modPestanyes = tabs
        ?.map(tab => theresReforcos && tab.toLowerCase() === 'pinya' ? 'soca' : tab)
        ?.map(tab => tab.toUpperCase())

    const modPestanyaPrev = modPestanyes
        ?.find((tab, idx) => idx + 1 === tabs?.map(t => t.toLowerCase()).indexOf(pestanya.toLowerCase()))

    return show && (
        <Pressable
            onClick={() => modPestanyaPrev && loopToPrevTab(pestanya)}
            className={`boto ${!modPestanyaPrev ? 'disabled' : ''}`}
            style={{
                backgroundColor: readonly ? 'rgb(234, 200, 255)' : 'rgba(234, 0, 255, 0.2)',
                padding: readonly ? '20px 20px' : 10,
            }}
        >
            <div
                style={{
                    display: 'flex',
                    alignItems: 'flex-start',
                    justifyContent: 'center'
                }}
            >
                <div>
                    &#x25BC;
                </div>
                <div
                    style={{
                        fontSize: 12
                    }}
                >
                    {modPestanyaPrev?.[0] || ''}
                </div>
            </div>
        </Pressable>
    )
}

export default BotoPestanyaDown;