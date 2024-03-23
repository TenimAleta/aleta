import { useEffect, useState } from "react";
import Pressable from "../../other/Pressable";

function QuiTrepitja(props) {

    const hasTrepitjats = props.json?.[props.choosingTrepitjat]?.trepitja_a?.length > 0
    const trepitjats = props.json?.[props.choosingTrepitjat]?.trepitja_a
    const chosenIsInTrepitjats = trepitjats?.includes(props.caixaSelected)

    const handleChooseTrepitjat = (caixaSelected, cancel=false) => {
        if (cancel) {
            // Go back up one pestanya
            const pestanyes = props.tabs
            const actualPestanya = props.pestanya
            const nextPestanya = pestanyes.indexOf(actualPestanya) > -1 && pestanyes.indexOf(actualPestanya) < pestanyes.length - 1 && pestanyes[pestanyes.indexOf(actualPestanya) + 1]
            if (nextPestanya) props.setPestanya(nextPestanya)

            props.setChoosingTrepitjat(-1)

            props.setAddons({
                ...props.addons,
                trepitjats: {
                    ...props.addons.trepitjats,
                    [caixaSelected]: undefined
                }
            })
        } else if (caixaSelected !== -1) {
            if (props.choosingTrepitjat !== -1 && props.choosingTrepitjat !== null) {
                props.setAddons({
                    ...props.addons,
                    trepitjacions: {
                        ...props.addons.trepitjacions,
                        [props.choosingTrepitjat]: hasTrepitjats ?
                            (chosenIsInTrepitjats ?
                                trepitjats.filter(t => t !== caixaSelected) :
                                trepitjats.concat(caixaSelected)
                            ) :
                            [caixaSelected]
                    }
                })

                // Go back up one pestanya
                const pestanyes = props.tabs
                const actualPestanya = props.pestanya
                const nextPestanya = pestanyes.indexOf(actualPestanya) > -1 && pestanyes.indexOf(actualPestanya) < pestanyes.length - 1 && pestanyes[pestanyes.indexOf(actualPestanya) + 1]
                if (nextPestanya) props.setPestanya(nextPestanya)

                props.setChoosingTrepitjat(-1)
            } else {
                props.setChoosingTrepitjat(caixaSelected)

                // Go down one pestanya
                const pestanyes = props.tabs
                const actualPestanya = props.pestanya
                const prevPestanya = pestanyes.indexOf(actualPestanya) > 0 && pestanyes[pestanyes.indexOf(actualPestanya) - 1]                
                if (prevPestanya) props.setPestanya(prevPestanya)
            }
        }
    }

    useEffect(() => {
        if (!props.popupClosed) return;

        const handleKeyDown = (event) => {
            if (event.key === 'T' || event.key === 't') {
                handleChooseTrepitjat(props.caixaSelected);
            }

            if ((props.choosingTrepitjat !== -1 && props.choosingTrepitjat !== null) && event.key === 'Escape') {
                handleChooseTrepitjat(props.caixaSelected, true);
            }
        }

        window.addEventListener('keydown', handleKeyDown);

        return () => {
            window.removeEventListener('keydown', handleKeyDown);
        }
    }, [props.caixaSelected, props.choosingTrepitjat, props.popupClosed])

    return props.show && (
        <>
            { props.choosingTrepitjat !== props.caixaSelected &&
                <Pressable className="boto" onClick={() => handleChooseTrepitjat(props.caixaSelected)}>
                    <span role="img" aria-label="change">
                        { props.choosingTrepitjat !== -1 && props.choosingTrepitjat !== null ?
                            (
                                hasTrepitjats && chosenIsInTrepitjats ? <>🗑️</> :
                                <>✅</>
                            ) :
                            <>👣</>
                        }
                    </span>
                    <div style={{
                        position: 'absolute',
                        left: 12,
                        backgroundColor: 'rgba(173, 216, 230, 0.7)', // lightblue with 70% transparency
                        fontSize: 10,
                        padding: 3,
                        borderRadius: 5,
                        color: 'rgba(0, 0, 0, 0.7)', // black font with 70% transparency
                    }}>
                        T
                    </div>
                </Pressable>
            }

            { (props.choosingTrepitjat !== -1 && props.choosingTrepitjat !== null) &&
                <Pressable className="boto" onClick={() => handleChooseTrepitjat(props.caixaSelected, true)}>
                    <span role="img" aria-label="change">
                        ❌
                    </span>
                    <div style={{
                        position: 'absolute',
                        left: 12,
                        backgroundColor: 'rgba(173, 216, 230, 0.7)', // lightblue with 70% transparency
                        fontSize: 10,
                        padding: 3,
                        borderRadius: 5,
                        color: 'rgba(0, 0, 0, 0.7)', // black font with 70% transparency
                    }}>
                        Esc
                    </div>
                </Pressable>
            }
        </>
    );
}

export default QuiTrepitja;