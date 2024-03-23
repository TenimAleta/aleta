import { useEffect, useState } from "react";
import Pressable from "../../other/Pressable";

function Escaletes(props) {

    const hasEscalats = props.json?.[props.choosingEscaleta]?.escala_a?.length > 0
    const escalats = props.json?.[props.choosingEscaleta]?.escala_a
    const chosenIsInEscalats = escalats?.includes(props.caixaSelected)

    const handleChooseEscalat = (caixaSelected, cancel=false) => {
        if (cancel) {
            // Go back down one pestanya
            const pestanyes = props.tabs
            const actualPestanya = props.pestanya
            const prevPestanya = pestanyes.indexOf(actualPestanya) > 0 && pestanyes[pestanyes.indexOf(actualPestanya) - 1]
            if (prevPestanya) props.setPestanya(prevPestanya)

            props.setChoosingEscaleta(-1)

            props.setAddons({
                ...props.addons,
                escaletes: {
                    ...props.addons.escaletes,
                    [caixaSelected]: undefined
                }
            })
        } else if (caixaSelected !== -1) {
            if (props.choosingEscaleta !== -1 && props.choosingEscaleta !== null) {
                props.setAddons({
                    ...props.addons,
                    escaletes: {
                        ...props.addons.escaletes,
                        [props.choosingEscaleta]: hasEscalats ?
                            (chosenIsInEscalats ?
                                escalats.filter(t => t !== caixaSelected) :
                                escalats.concat(caixaSelected)
                            ) :
                            [caixaSelected]
                    }
                })

                // Go back down one pestanya
                const pestanyes = props.tabs
                const actualPestanya = props.pestanya
                const prevPestanya = pestanyes.indexOf(actualPestanya) > 0 && pestanyes[pestanyes.indexOf(actualPestanya) - 1]
                if (prevPestanya) props.setPestanya(prevPestanya)

                props.setChoosingEscaleta(-1)
            } else {
                props.setChoosingEscaleta(caixaSelected)

                // Go up one pestanya
                const pestanyes = props.tabs
                const actualPestanya = props.pestanya
                const nextPestanya = pestanyes.indexOf(actualPestanya) > -1 && pestanyes.indexOf(actualPestanya) < pestanyes.length - 1 && pestanyes[pestanyes.indexOf(actualPestanya) + 1]
                if (nextPestanya) props.setPestanya(nextPestanya)
            }
        }
    }

    useEffect(() => {
        if (!props.popupClosed) return;

        const handleKeyDown = (event) => {
            if (event.key === 'E' || event.key === 'e') {
                handleChooseEscalat(props.caixaSelected);
            }

            if ((props.choosingEscaleta !== -1 && props.choosingEscaleta !== null) && event.key === 'Escape') {
                handleChooseEscalat(props.caixaSelected, true);
            }
        }

        window.addEventListener('keydown', handleKeyDown);

        return () => {
            window.removeEventListener('keydown', handleKeyDown);
        }
    }, [props.caixaSelected, props.choosingEscaleta, props.popupClosed])

    return props.show && (
        <>
            { props.choosingEscaleta !== props.caixaSelected &&
                <Pressable className="boto" onClick={() => handleChooseEscalat(props.caixaSelected)}>
                    <span role="img" aria-label="change">
                        { props.choosingEscaleta !== -1 && props.choosingEscaleta !== null ?
                            (
                                hasEscalats && chosenIsInEscalats ? <>🗑️</> :
                                <>✅</>
                            ) :
                            <>🪜</>
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
                        E
                    </div>
                </Pressable>
            }

            { (props.choosingEscaleta !== -1 && props.choosingEscaleta !== null) &&
                <Pressable className="boto" onClick={() => handleChooseEscalat(props.caixaSelected, true)}>
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

export default Escaletes;