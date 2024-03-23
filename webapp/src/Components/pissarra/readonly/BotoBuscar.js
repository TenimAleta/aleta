import React, { useState, useRef, useEffect } from 'react';
import { isBrowser } from 'react-device-detect';
import { panToCaixa } from '../PissarraController';
import Pressable from '../../other/Pressable';

function BotoBuscar({ caixaSelected, panzoom, castellersInfo, posicions, setCaixaSelected }) {
    const [focused, setFocused] = useState(false);
    const [search, setSearch] = useState('');
    const inputRef = useRef();

    const searchableName = (info) => `${info.nom} ${info.cognom} ${info.mote}`
    const normalize = (str) => str.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
    
    useEffect(() => {
        if (focused) {
            inputRef.current.focus();
        } else {
            setSearch('');
            setCaixaSelected(-1);
            inputRef.current.blur();
        }
    }, [focused])

    useEffect(() => {
        if (search.length > 0) {
            const matchedUsers = Object.values(castellersInfo)
                .filter((info) => normalize(searchableName(info)).includes(normalize(search)))
                .filter(({ id }) => id in posicions.castellers)

            if (matchedUsers.length > 0) {
                const matchedUser = matchedUsers[0];
                const matchedCaixa = posicions.castellers[matchedUser.id];

                setCaixaSelected(String(matchedCaixa));
            }
        }
    }, [search, castellersInfo])

    useEffect(() => {
        panToCaixa(caixaSelected, panzoom, false)
    }, [caixaSelected])

    return (
        <>
            <input
                ref={inputRef}
                type="text"
                placeholder="Buscar..."
                value={search}
                onChange={e => setSearch(e.target.value)}
                style={{
                    opacity: 0,
                    position: 'absolute',
                    left: '-10000px',
                }}
            />

            <Pressable
                onClick={() => {
                    setFocused(prev => !prev);
                }}
                style={{
                    borderRadius: 10,
                    backgroundColor: 'lightblue',
                    padding: 25,
                    boxShadow: '3px 3px 3px 0px rgba(0,0,0,0.2)',
                }}
            >
                {
                    !focused ? <>🔍</> :
                    <>❌</>
                }
            </Pressable>
        </>
    )
}

export default BotoBuscar;