import { useEffect, useState } from "react";
import Pressable from "../../other/Pressable";

function Duplicator(props) {

    const handleDuplicating = (caixaSelected, cancel=false) => {
        if (cancel) {
            props.setDuplicating(-1)

            const { clone, ...rest } = props.json[caixaSelected]

            props.setJsonOutput({
                ...props.json,
                [caixaSelected]: rest
            })
        } else if (caixaSelected !== -1) {
            if (props.duplicating !== -1 && props.duplicating !== null) {
                props.setJsonOutput({
                    ...props.json,
                    [props.duplicating]: {
                        ...props.json[props.duplicating],
                        clone: caixaSelected
                    }
                })

                props.setDuplicating(-1)
            } else {
                props.setDuplicating(caixaSelected)

                props.setJsonOutput({
                    ...props.json,
                    [caixaSelected]: {
                        ...props.json[caixaSelected],
                        clone: -1
                    }
                })
            }
        }
    }

    useEffect(() => {
        if (!props.popupClosed) return;

        const handleKeyDown = (event) => {
            if (event.key === 'D' || event.key === 'd') {
                handleDuplicating(props.caixaSelected);
            }

            if ((props.duplicating !== -1 && props.duplicating !== null) && event.key === 'Escape') {
                handleDuplicating(props.caixaSelected, true);
            }
        }

        window.addEventListener('keydown', handleKeyDown);

        return () => {
            window.removeEventListener('keydown', handleKeyDown);
        }
    }, [props.caixaSelected, props.duplicating, props.popupClosed])

    return props.show && (
        <>
            { props.duplicating !== props.caixaSelected &&
                <Pressable className="boto" onClick={() => handleDuplicating(props.caixaSelected)}>
                    <span role="img" aria-label="change">
                        { props.duplicating !== -1 && props.duplicating !== null ? <>✅</> : <>👥</> }
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
                        D
                    </div>
                </Pressable>
            }

            { (props.duplicating !== -1 && props.duplicating !== null) &&
                <Pressable className="boto" onClick={() => handleDuplicating(props.caixaSelected, true)}>
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

export default Duplicator;