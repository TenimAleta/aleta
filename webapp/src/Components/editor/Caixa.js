import React, { useEffect, useState } from 'react';
import { isBrowser } from 'react-device-detect';
import SelectableCaixa from './selectableCaixa';
import { cordoToColor } from './modes/cordons/CordoSetter';
import Pressable from '../other/Pressable';
import { darkenColor, perfilToColor } from './modes/etiquetes/EtiquetesSetter';

const parseTransformation = t => {
    let [a, b, c, d, x, y] = t;
    return `matrix(${a},${b},${c},${d},${x},${y})`;
};

const descaleFontSize = (fontSize, mat) => {
    const [a, b, c, d, x, y] = mat;
    const scale = Math.sqrt(Math.abs(a*d - b*c))
    return Math.round(fontSize / scale);
};

const parseProps = props => {
    let parsedProps = {};
    
    parsedProps.transform = props.transform && parseTransformation(props.transform);
    parsedProps.width = props.width && `${props.width}px`;
    parsedProps.height = props.height && `${props.height}px`;
    parsedProps.backgroundColor = props.fill;

    return parsedProps;
};

const modifyTransformation = (t, x, y) => {
    let [a, b, c, d, x0, y0] = t;
    return [a, b, c, d, x, y];
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

const getName = info =>
    (!!parseInt(info?.canalla) ? '👶 ' : '') +
    (!!parseInt(info?.music) ? '🥁 ' : '') +
    (!!parseInt(info?.lesionat) ? '🏥 ' : '') +
    (info.mote || `${info.nom} ${info.cognom[0] + '.' || ''}`)

function Caixa(props) {
    const { mode, boxProps, textProps, readonly, position, setPosition, followPosition, fontSize } = props;
    const [_boxStyle, _textStyle] = [boxProps, textProps].map(p => parseProps(p));

    const boxStyle = {
        ..._boxStyle,
        opacity: props.opacity,
        outlineWidth: mode === 'cordons' || mode === 'etiquetes' ? 2 : 0,
        outlineStyle: 'solid',
        outlineColor: 
            mode === 'cordons' ? cordoToColor(props.cordo) :
            mode === 'etiquetes' ? perfilToColor(props?.perfil?.toUpperCase()) :
            'black'
    }

    const textStyle = {
        ..._textStyle,
        ['fontSize']: boxProps.transform ?
            descaleFontSize(fontSize, boxProps.transform) :
            fontSize,
        ['transform']: parseTransformation(
            fixOrientation(boxProps.transform, textProps.transform)
        ),
        color:
            mode === 'cordons' ? 'black' :
            mode === 'etiquetes' ? darkenColor(perfilToColor(props?.perfil?.toUpperCase()), 100) :
            'black'
    }

    const isSelected = props.caixaSelected === props.id;
    const isRotated = boxProps.width < boxProps.height;

    const modifiedPos = position && followPosition === props.id ? parseTransformation(modifyTransformation(boxProps.transform, position.x, position.y)) : parseTransformation(boxProps.transform)

    const generateColor = (str) => {
        let hash = 0;
        for (let i = 0; i < str.length; i++) {
            hash = str.charCodeAt(i) + ((hash << 5) - hash);
        }
        let color = (hash & 0x00FFFFFF)
            .toString(16)
            .toUpperCase();
        color = "00000".substring(0, 6 - color.length) + color;
        return '#' + '55' + color.slice(2, 6);
    }

    const generateFontColor = (str) => {
        // Generate a complementary color to the background color
        const color = generateColor(str);
        const r = parseInt(color.slice(1, 3), 16);
        const g = parseInt(color.slice(3, 5), 16);
        const b = parseInt(color.slice(5, 7), 16);

        const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
        return luminance > 0.5 ? 'black' : 'white';
    }

    return (
        <SelectableCaixa selected={isSelected} setPosition={setPosition} {...props}>
            <Pressable id={`caixa-${props.id}`} style={{...boxStyle, ['transform']: modifiedPos }} className={`rect ${isRotated ? 'rotated' : ''}`}>
                {
                    mode === 'cordons' ?
                        <div className='text' style={textStyle}>
                            {
                                props.cordo === 0 ? 'NUCLI' :
                                !isNaN(props.cordo) ? props.cordo :
                                ''
                            }
                        </div>
                    :
                    mode === 'etiquetes' ?
                        <div className='text' style={textStyle}>
                            {props.perfil?.toUpperCase()}
                        </div>
                    :
                        <>
                            <div className='text' style={textStyle}>
                                <div>
                                    <div style={{ display: 'flex', justifyContent: 'space-around', fontSize: 8 }}>
                                        {props.trepitjadors?.map((trepitjador, i) => <div key={trepitjador}>👣 {trepitjador.toString().slice(0,3)}</div>)}
                                    </div>
                                    <div style={{ display: 'flex', justifyContent: 'space-around', fontSize: 8 }}>
                                        {props.escaladors?.map((escalador, i) => <div key={escalador}>🪜 {escalador.toString().slice(0,3)}</div>)}
                                    </div>
                                    <div style={{ display: 'flex', flexDirection: 'row', justifyContent: 'center', alignItems: 'center' }}>
                                        <div style={{ fontSize: 10 }}>
                                            {props?.isEscaleta ? '🪜 ' : ''}
                                            {props?.isTrepitjador ? '👣 ' : ''}
                                        </div>
                                        {!(props.clone && props.clone !== -1) && props.id.toString().slice(0,3)}
                                    </div>
                                </div>
                            </div>
                            { (props.clone && props.clone !== -1) && <div className='text' style={textStyle}>🔗 {props.clone.toString().slice(0,3)}</div> }
                            <div className={`individual-displays relative`}>
                                {/* { props.perfil && props.etiqueta && <div className={`individual-display`} style={{ backgroundColor: generateColor(props.perfil.toUpperCase()), color: generateFontColor(props.perfil.toUpperCase()), fontSize: 6 }}>{props.perfil.toUpperCase()}</div> } */}
                                { props.pom && <div className={`individual-display`} style={{ backgroundColor: 'lightblue', color: 'black', fontSize: 6 }}>👶 {props.pom.toUpperCase()}</div> }
                                {/* { props.pestanya && <div className={`individual-display`} style={{ backgroundColor: '#FA70d5', fontSize: 6 }}>{props.pestanya.toUpperCase()}</div> } */}
                                { (props.pilar || props.pilar === 0) && !isNaN(props.pilar) && <div className={`individual-display`} style={{ backgroundColor: '#FAAB78', fontSize: 10 }}>{props.pilar}</div> }
                            </div>
                        </>
                }
            </Pressable>
        </SelectableCaixa>
    );
}

export default Caixa;