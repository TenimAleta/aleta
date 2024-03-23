import React from 'react';
import { isBrowser } from 'react-device-detect';
import FloatingButtons from './floating/FloatingButtons';
import SelectableCaixa from './selectableCaixa';
import { setPerfil } from './controller/Casteller';
import { ProfilePic } from './watchers/UserList';
import moment from 'moment';
import { applyTimeZone } from '../interface/assistencia/LlistaAssistencies';

const parseTransformation = t => {
    let [a, b, c, d, x, y] = t;
    return `matrix(${a},${b},${c},${d},${x},${y})`;
};

const descaleFontSize = (fontSize, mat) => {
    const [a, b, c, d, x, y] = mat;
    const scale = Math.sqrt(Math.abs(a*d - b*c))
    return Math.round(fontSize / scale);
};

const fixOrientation = (boxTransf, textTransf) => {
    const [a, b, c, d, e, f] = boxTransf;

    // Negative determinant means the box is flipped
    if (a*d - b*c < 0) {
        const [ta, tb, tc, td, te, tf] = textTransf;

        return [
            -ta, tb, -tc, td, te, tf
        ]
    }
    return textTransf;
}

const parseProps = props => {
    let parsedProps = {};
    
    parsedProps.transform = props.transform && parseTransformation(props.transform);
    parsedProps.width = props.width && `${props.width}px`;
    parsedProps.height = props.height && `${props.height}px`;
    parsedProps.backgroundColor = props.fill;
    parsedProps.position = props.relative ? 'relative' : 'absolute'

    return parsedProps;
};

const getName = (info, props) =>
    (!!parseInt(info?.canalla) ? '👶 ' : '') +
    (!!parseInt(info?.music) ? '🥁 ' : '') +
    (!!parseInt(info?.lesionat) ? '🏥 ' : '') +
    (props.isEscaleta ? '🪜 ' : '') +
    (info.mote || `${info.nom} ${info.cognom[0] + '.' || ''}`)

function Caixa(props) {
    const { fullAssistencia, castellBeingImported, cordo, showUntil, boxProps, textProps, readonly, perfil, fontSize, rotationVal, pestanya, targetAssistencia, targetEvent } = props;
    const [_boxStyle, _textStyle] = [boxProps, textProps].map(p => parseProps(p));

    const boxStyle = {
        ..._boxStyle,
        backgroundColor: (['sarri'].includes(props.colla) && cordo === showUntil) || props.disabled ? 'rgba(255,225,225,1)' : _boxStyle.backgroundColor,
        visibility: cordo && cordo > showUntil + 1 ? 'hidden' : 'visible',
        outlineStyle: cordo && cordo === showUntil + 1 ? 'dashed' : 'none',
        opacity: props.caixaSelected !== props.id && cordo && cordo === showUntil + 1 ? 0.25 : props.opacity,
        borderStyle: castellBeingImported ? 'solid' : 'none',
        borderColor: props.id.startsWith(castellBeingImported) ? 'rgba(255, 0, 0, 1)' : _boxStyle.backgroundColor,
    }

    const fontSizeStyle = {
        'fontSize': boxProps.transform ?
            descaleFontSize(fontSize, boxProps.transform) :
            fontSize,
        ['transform']: parseTransformation(
            fixOrientation(boxProps.transform, textProps.transform)
        ),
    }

    const textStyle = {
        ..._textStyle,
        ...fontSizeStyle,
    }

    const deletedUser = Object.keys(props.castellersInfo).length > 0 && props.assignat !== -1 && !(props.assignat in props.castellersInfo);
    const textValue = deletedUser ? 'ELIMINAT' : props.assignat in props.castellersInfo ? getName(props.castellersInfo[props.assignat], props) : (props.isEscaleta ? '🪜 ' : '')
    const altura = props.assignat in props.castellersInfo ? props.castellersInfo[props.assignat]?.altura : '';
    const altura_mans = props.assignat in props.castellersInfo ? props.castellersInfo[props.assignat]?.altura_mans : '';
    const isSelected = props.caixaSelected === props.id;

    const isRotated = boxProps.width < boxProps.height;
    const notComingToDiada = (props.assignat > -1 && targetEvent) && !['Vinc', 'Fitxat'].includes(targetAssistencia)
    const targetAssistenciaSimple = targetAssistencia === 'No vinc' ? 'novinc' :
        targetAssistencia === 'No confirmat' ? 'noconfirmat' :
        targetAssistencia === 'Fitxat' ? 'fitxat' :
        targetAssistencia === 'Vinc' ? 'vinc' :
        'noconfirmat'

    const entrada = props.arribenTard.includes(props.assignat) ? applyTimeZone(fullAssistencia?.['data-entrada'])?.format('HH:mm') : null;
    const sortida = props.surtenAviat.includes(props.assignat) ? applyTimeZone(fullAssistencia?.['data-sortida'])?.format('HH:mm') : null;

    return (
        <SelectableCaixa selected={isSelected} {...props}>
            <div id={`caixa-${props.id}`} style={boxStyle} className={`rect ${isRotated ? 'rotated' : ''}`}>
                <div style={{...textStyle, ...{ display: 'flex', flexDirection: 'row', gap: 5 }}}>
                    {
                        props.arribenTard.includes(props.assignat) && (
                            <div
                                style={{
                                    position: 'absolute',
                                    top: -12,
                                    left: 0,
                                    fontSize: 6,
                                    color: 'white',
                                    backgroundColor: 'rgba(255, 0, 0, 0.8)',
                                    padding: 1,
                                    borderRadius: 2,
                                    whiteSpace: 'nowrap',
                                }}
                            >
                                🛬{entrada}
                            </div>
                        )
                    }
                    {
                        props.surtenAviat.includes(props.assignat) && (
                            <div
                                style={{
                                    position: 'absolute',
                                    top: -12,
                                    left: 20, // Adjust left position for the second bubble
                                    fontSize: 6,
                                    color: 'white',
                                    backgroundColor: 'rgba(255, 0, 0, 0.8)',
                                    padding: 1,
                                    borderRadius: 2,
                                    whiteSpace: 'nowrap',
                                }}
                            >
                                🛫{sortida}
                            </div>
                        )
                    }

                    {
                        // Desactivat
                        false && props.assignat > -1 && (
                            <div
                                style={{
                                    display: 'flex',
                                    justifyContent: 'center',
                                    alignItems: 'center',
                                }}
                            >
                                <ProfilePic
                                    user={props.assignat}
                                    width={20}
                                    height={20}
                                />
                            </div>
                        )
                    }

                    <div className={`text ${notComingToDiada ? `diada-${targetAssistenciaSimple}` : ''} ${readonly && isBrowser ? 'projectormode' : ''}`}>
                        {textValue}
                    </div>
                    { (!readonly && altura !== null && altura !== '' && !isNaN(altura)) && <div className={`altura ${setPerfil(altura)}`}>{altura}</div> }
                </div>
                { (!readonly && !['tronc', 'baix'].includes(perfil) && !['tronc'].includes(pestanya.toLowerCase()) && altura_mans !== null && altura_mans !== '' && !isNaN(altura_mans)) && <div className={`individual-display relative ${isRotated ? 'rotated' : ''}`} style={{ backgroundColor: '#FAAB78' }}>{altura_mans}</div> }
            </div>
        </SelectableCaixa>
    );
}

export default React.memo(Caixa, (props, newProps)=> {
    const caixaSelectedHasNotChanged = props.caixaSelected === newProps.caixaSelected;

    const infoHasNotChanged = newProps.assignat in newProps.castellersInfo ? JSON.stringify(props.castellersInfo[newProps.assignat]) === JSON.stringify(newProps.castellersInfo[newProps.assignat]) : true;
    const assignatHasNotChanged = props.assignat === newProps.assignat;

    const arribaTardHasNotChanged = props.arribenTard.includes(props.assignat) === newProps.arribenTard.includes(newProps.assignat)
    const surtAviatHasNotChanged = props.surtenAviat.includes(props.assignat) === newProps.surtenAviat.includes(newProps.assignat)

    const plantillaHasNotChanged = Object.keys(props.json).length === Object.keys(newProps.json).length;

    const rotationValHasNotChanged = props.rotationVal === newProps.rotationVal;

    const targetAssistenciaHasNotChanged = props.targetAssistencia === newProps.targetAssistencia;
    const targetEventHasNotChanged = props.targetEvent === newProps.targetEvent;

    const assistenciaHasNotChanged = props.assistencia === newProps.assistencia;

    const opacityHasNotChanged = props.opacity === newProps.opacity;
    const positionHasNotChanged = props.position === newProps.position;
    
    const showUntilHasNotChanged = props.showUntil === newProps.showUntil && props.hasCordons === newProps.hasCordons;
    const isModelHasNotChanged = props.isModels === newProps.isModels;

    const isEscaletaHasNotChanged = props.isEscaleta === newProps.isEscaleta;
    const castellBeingImportedHasNotChanged = props.castellBeingImported === newProps.castellBeingImported;

    // Do not re-render if...
    return assistenciaHasNotChanged && castellBeingImportedHasNotChanged && isEscaletaHasNotChanged && isModelHasNotChanged && showUntilHasNotChanged && positionHasNotChanged && opacityHasNotChanged && targetEventHasNotChanged && targetAssistenciaHasNotChanged && caixaSelectedHasNotChanged && infoHasNotChanged && assignatHasNotChanged && arribaTardHasNotChanged && surtAviatHasNotChanged && plantillaHasNotChanged && rotationValHasNotChanged
});