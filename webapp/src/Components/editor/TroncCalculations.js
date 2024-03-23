import { useEffect, useState } from "react"
import Caixa from "./Caixa"

function IndividualDisplays({ pestanya, pilarsCaixes, json, pilarsAltures, pilarsAlturesMans, cummulativeAltures }) {
    const dontDisplay = pilarsCaixes
        .map(pilar => pilar.map(id => json[id]))
        .map(pilar => pilar.map(caixa => caixa?.pestanya.toLowerCase() !== pestanya.toLowerCase()))

    const individualDisplaysTransfs = pilarsCaixes
        .map(pilar => pilar.map(id => json[id]))
        .map(pilar => pilar.map(caixa => caixa.box.transform))
        // .map(pilar => pilar.map(([a,b,c,d,x,y]) => [a,b,c,d, x-10, y-10]))
        .map(pilar => pilar.map(([a,b,c,d,x,y]) => `matrix(1,0,0,1,${x},${y})`))

    const individualDisplays = individualDisplaysTransfs
        .map((pilar, i) => 
            pilar.map((transform, j) => {
                return (
                    <div key={`indivdisplay-${i}-${j}`} className="individual-displays" style={{
                        transform: transform,
                        display: dontDisplay[i][j] ? 'none' : 'flex',
                    }}>
                        <div className="individual-display">
                            { cummulativeAltures[i][j] }
                        </div>
                        { !isNaN(parseInt(pilarsAlturesMans[i][j]) - (140 + parseInt(pilarsAltures[i][j]))) && 
                            <div className="individual-display" style={{ backgroundColor: 'darkorange' }}>
                                { parseInt(pilarsAlturesMans[i][j]) - (140 + parseInt(pilarsAltures[i][j])) }
                            </div>
                        }
                    </div>
                )
            })
        )

    return (
        <div className="individual-displays-container">
            { individualDisplays }
        </div>
    )
}

function NumberIncrementer({ value, setValue, readonly }) {
    const numberIncrementerStyle = {
        display: 'flex',
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        // Wood color
        backgroundColor: 'rgba(133,94,66, 0.75)',
        color: 'white',
        borderRadius: 5,
        padding: 5,
        paddingLeft: 10,
        paddingRight: 10,
        fontSize: 12,
        cursor: 'pointer',
    }

    const askForValue = () => {
        const newValue = prompt('Corregeix per desnivell', value);
        const isNumber = !isNaN(parseInt(newValue));

        if (newValue && isNumber) {
            setValue(newValue);
        }
    }

    return (
        <div style={numberIncrementerStyle} onPointerUp={readonly ? undefined : askForValue}>
            FUSTA
        </div>
    )
}

function Fustes({ i, pestanya, socket, pilarsCaixes, json, fustes, setFustes, posicions, ...props }) {
    const changeFustes = (newFustes) => {
        if (newFustes.length > 0) {
            const action_id = Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
            socket.emit('.save_change', `FUSTES,ARRAY,${newFustes.length},${newFustes.join(',')}`, action_id);
        }
    }

    useEffect(() => {
        setFustes(new Array(pilarsCaixes.length).fill(0))
    }, [
        JSON.stringify(pilarsCaixes)
    ])

    return (
        <div className="fustes-container">
            <NumberIncrementer
                value={fustes[i] || 0}
                setValue={value => {
                    const newFustes = [...fustes]
                    newFustes[i] = value
                    setFustes(newFustes)

                    // Sincronize with server
                    changeFustes(newFustes)
                }}
                {...props}
            />
        </div>
    )
}

function NomColumna({ i, addons, setAddons, setIsFocused, isFocused }) {
    const handleChange = (e) => {
        setAddons(prev => {
            return {
                ...prev,
                noms_columnes: {
                    ...(prev?.noms_columnes || {}),
                    [i]: e.target.value
                }
            }
        })
    }

    return (
        <div className="nom-columna">
            <input
                type="text"
                value={addons?.noms_columnes?.[i] || ''}
                placeholder={`Columna ${i}`}
                onChange={handleChange}
                onFocus={() => setIsFocused(true)}
                onBlur={() => setIsFocused(false)}
                style={{
                    fontSize: 10,
                    border: 'none',
                }}
            />
        </div>
    )
}

function DuplicatedBaixos(props) {
    const { readonly, setAddons, addons, posicions, pestanya, pilarsCaixes, json } = props

    const doDisplay = pilarsCaixes
        .map(pilar => pilar.map(id => json[id]))
        .map(pilar => pilar.map(caixa => caixa?.pestanya.toLowerCase() !== pestanya.toLowerCase()))

    const caixesTransfs = pilarsCaixes
        .map(pilar => pilar.map(id => json[id]))
        .map(pilar => pilar.filter(caixa => caixa?.pestanya.toLowerCase() === pestanya.toLowerCase()))
        .map(pilar => pilar.map(caixa => caixa.box.transform))

    const caixaAttributes = pilarsCaixes
        .map(pilar => pilar.map(id => json[id]))
        .map(pilar => pilar.map(caixa => caixa.box))
        .flat()
        [0] || [0,0]

    const [caixaWidth, caixaHeight] = [
        parseInt(caixaAttributes.width),
        parseInt(caixaAttributes.height)
    ]

    const caixesXYs = caixesTransfs
        .map(pilar => pilar.map(([a,b,c,d,x,y]) => [x,y]))

    const isRotated = caixesTransfs
        .map(pilar => pilar.map(([a,b,c,d,x,y]) => a*c + b*d < 0))

    // Lowest point of the pilar
    const lowestXYs = caixesXYs
        .map(pilar => pilar.reduce((acc, [x,y]) => y > acc[1] ? [x,y] : acc, [-Infinity,-Infinity]))

    // Fix infinite values
    const lowestXYsFixed = lowestXYs
        .map(([x,y], i) => [x === -Infinity && i > 0 ? lowestXYs[i-1][0] + caixaWidth + 10 : x, y === -Infinity && i > 0 ? lowestXYs[i-1][1] : y])

    const lowestTransfs = lowestXYsFixed
        .map(([x,y], i) => !isRotated[i] ? [x, parseInt(y) + caixaWidth] : [x, parseInt(y) + caixaHeight])
        .map(([x,y]) => [x, y + 10])
        .map(([x,y]) => `translate(${x}px, ${y}px)`)

    const lowestTransformStyle = i => ({
        position: 'absolute',
        transform: lowestTransfs[i],
    })

    const escaletes = [...Object.entries(json)]
        .filter(el => el[1] && el[1].type === 'caixa')
        .filter(([id, attrs]) => attrs.escala_a && Array.isArray(attrs.escala_a) && attrs.escala_a.length > 0)
        .map(([id, attrs]) => attrs.escala_a.map(escalat => ({
            escalador: id,
            escalat: escalat
        })))
        .flat()

    const trepitjacions = [...Object.entries(json)]
        .filter(el => el[1] && el[1].type === 'caixa')
        .filter(([id, attrs]) => attrs.trepitja_a && Array.isArray(attrs.trepitja_a) && attrs.trepitja_a.length > 0)
        .map(([id, attrs]) => attrs.trepitja_a.map(trepitjat => ({
            trepitjador: id,
            trepitjat: trepitjat
        })))
        .flat()
    
    return (
        <div>
            { pestanya.toLowerCase() === 'tronc' && lowestTransfs.map((transform, i) => (
                <div key={`baixos-${i}`} className="fusta" style={{
                    ...lowestTransformStyle(i),
                    display: 'flex',
                    flexDirection: 'column',
                }}>
                    <div
                        style={{
                            display: 'flex',
                            flexDirection: 'column',
                            gap: parseFloat(caixaHeight) + 10,
                            height: (parseFloat(caixaHeight) + 10) * pilarsCaixes[i].filter((id, j) => doDisplay[i][j]).length,
                        }}
                    >
                    {
                        pilarsCaixes[i]
                            .filter((id, j) => doDisplay[i][j])
                            .map((caixa_id, j) => {
                                const boxProps = json[caixa_id]["box"]
                                const alteredBoxProps = { ...boxProps }
                                alteredBoxProps.transform = [1,0,0,1,0,0]
                                alteredBoxProps.relative = true

                                if (boxProps.width < boxProps.height) {
                                    alteredBoxProps.width = boxProps.height
                                    alteredBoxProps.height = boxProps.width
                                }

                                const textProps = json[caixa_id]["text"]
                                const alteredTextProps = { ...textProps }
                                alteredTextProps.transform = [1,0,0,1,0,0]

                                const trepitjadors = trepitjacions
                                    .filter(trepitjacio => trepitjacio.trepitjat === caixa_id)
                                    .map(trepitjacio => trepitjacio.trepitjador)
                        
                                const escaladors = escaletes
                                    .filter(escaleta => escaleta.escalat === caixa_id)
                                    .map(escaleta => escaleta.escalador)
                        
                                const isEscaleta = json[caixa_id]?.escala_a?.length > 0                    

                                return (
                                    <div
                                        key={`duplicated-${caixa_id}`}
                                        style={{ position: 'relative' }}
                                    >
                                        <Caixa
                                            key={caixa_id}
                                            {...json[caixa_id]}
                                            trepitjadors={trepitjadors}
                                            escaladors={escaladors}
                                            isEscaleta={isEscaleta}
                                            id={caixa_id}
                                            boxProps={alteredBoxProps}    
                                            textProps={alteredTextProps}  
                                            className="noselectable"
                                            fill={json[caixa_id].fill || 'white'}
                                            assignat={-1}
                                            hasClone={'clone' in json[caixa_id]}
                                            fontSize={14}
                                            {...props}
                                            disabled={true}
                                        />
                                    </div>
                                )
                            })
                            .reverse()
                        }
                    </div>
                    
                    <div
                        key={`fustes`}
                        style={{
                            display: 'flex',
                            justifyContent: 'center',
                            marginTop: 5,
                        }}
                    >
                        <Fustes
                            i={i}
                            pilarsCaixes={pilarsCaixes}
                            json={json}
                            posicions={posicions}
                            pestanya={pestanya}
                            {...props}
                            readonly={true}
                        />
                    </div>

                    <div
                        key={`nom-columna`}
                        style={{
                            display: 'flex',
                            justifyContent: 'center',
                            marginTop: 20,
                            width: Math.max(caixaWidth, caixaHeight),
                        }}
                    >
                        <NomColumna
                            i={i}
                            addons={addons}
                            setAddons={setAddons}
                            {...props}
                        />
                    </div>
                </div>
            )) }
        </div>
    )
}

function TroncCalculations({ opacity, json, posicions, castellersInfo, pestanya, ...props }) {
    const possiblePilars = [...new Set(
        Object.values(json)
            .filter(caixa => caixa.pilar || caixa.pilar === 0)
            .filter(caixa => !isNaN(caixa.pilar))
            .map(caixa => caixa.pilar)
        || []
    )]
        .sort((a,b) => a > b ? 1 : -1)

    // Fetch values
    const orderedTabs = ['pinya', 'folre', 'manilles', 'puntals', 'tronc', 'organització'].reverse()

    const pilarsCaixes = possiblePilars
        .map(pilar => Object.keys(json)
            .filter(id => json[id].pilar === pilar)
        )
        .map(pilar =>
            pilar
                .filter(id => json[id]?.box?.transform)
                .filter(id => json[id].box.transform.length >= 1)
                .sort((a,b) => {
                    const a_pestanya = json[a].pestanya.toLowerCase()
                    const b_pestanya = json[b].pestanya.toLowerCase()

                    if (a_pestanya !== b_pestanya) {
                        if (orderedTabs.includes(a_pestanya) && orderedTabs.includes(b_pestanya)) {
                            return orderedTabs.indexOf(a_pestanya) < orderedTabs.indexOf(b_pestanya) ? 1 : -1;
                        } else if (orderedTabs.includes(a_pestanya)) {
                            return 1;
                        } else if (orderedTabs.includes(b_pestanya)) {  
                            return -1;
                        }
                    }

                    const a_y = json[a].box.transform.at(-1);
                    const b_y = json[b].box.transform.at(-1);

                    return a_y < b_y ? 1 : -1;
                })   
        )

    const [fustes, setFustes] = useState([])

    return (
        <div
            style={{
                opacity: opacity
            }}
        >
            <DuplicatedBaixos
                pilarsCaixes={pilarsCaixes}
                json={json}
                pestanya={pestanya}
                posicions={posicions}
                castellersInfo={castellersInfo}
                fustes={fustes}
                setFustes={setFustes}
                {...props}
            />
        </div>
    )
}

export default TroncCalculations;