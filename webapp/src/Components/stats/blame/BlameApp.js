import { useEffect } from "react";
import { fetchAPI } from "../../../utils/utils";
import { useState } from "react";
import AuthorHistogram from "./AuthorHistogram";
import Ranking from "./Ranking";
import LastChanges from "./LastChanges";
import Pressable from "../../other/Pressable";

function BlameApp({ castellersInfo, setCastellersInfo }) {
    const [allCanvis, setAllCanvis] = useState([]);
    const [nHores, setNHores] = useState(24);
    const [nLastCanvis, setNLastCanvis] = useState(200);
    const [bundles, setBundles] = useState({});
    const [events, setEvents] = useState([]);

    const timestampedCanvis = allCanvis
        .flat()
        .filter(canvi => !canvi.includes('OPTIONS'))
        .map(log => log.split(','))
        .filter(([caixa, casteller, author, timestamp, actionId, url]) => timestamp)
        .filter(([caixa, casteller, author, timestamp, actionId, url]) => author !== 'anonymous')
        .map(([caixa, casteller, author, timestamp, actionId, url]) => ({
            author,
            timestamp,
            caixa,
            casteller,
            actionId,
            url,
        }))

    const lastCanvis = timestampedCanvis
        .sort((a, b) => new Date(a.timestamp) > new Date(b.timestamp) ? -1 : 1)
        .slice(0, nLastCanvis)

    const ranking = timestampedCanvis
        .filter((entry) => new Date(entry.timestamp) >= new Date(Date.now() - nHores * 60 * 60 * 1000))
        .reduce((acc, { author }) => {
            acc[author] = acc[author] ? acc[author] + 1 : 1;
            return acc;
        }, {})

    useEffect(() => {
        fetchAPI('/bundles', setBundles)
    }, [])

    useEffect(() => {
        fetchAPI('/events', setEvents)
    }, [])

    useEffect(() => {
        fetchAPI('/get_all_positions_logs', (res) => {
            res.forEach(canvisURL => {
                fetch(canvisURL)
                    .then(res => res.text())
                    .then(text => text.split('\n'))
                    .then(canvis => {
                        const canvisWithURL = canvis
                            .filter(canvi => !canvi.includes('OPTIONS'))
                            .map(canvi => canvi.split(','))
                            .filter(([caixa, casteller, author, timestamp, actionId]) => timestamp)
                            .filter(([caixa, casteller, author, timestamp, actionId]) => author !== 'anonymous')
                            .map(([caixa, casteller, author, timestamp, actionId]) => ([
                                caixa, casteller, author, timestamp, actionId,
                                canvisURL,
                            ]))
                            .map(canvi => canvi.join(','))

                        const canvisWithoutDuplicates = canvisWithURL
                            // It is duplicate if actionId is the same
                            .filter((canvi, index, self) => self.findIndex(c => c.split(',')[4] === canvi.split(',')[4]) === index)

                        setAllCanvis(prev => [...prev, canvisWithoutDuplicates]);
                    })
            })
        })
    }, []);

    useEffect(() => {
        window.history.pushState({}, '', '/stats/blame');
    }, [])

    const displayName = user => user in castellersInfo ? `${castellersInfo[user].nom} ${castellersInfo[user].cognom}` + (castellersInfo[user].mote ? ` (${castellersInfo[user].mote})` : '') : user
    const displayShortName = user => user in castellersInfo ? castellersInfo[user].mote || `${castellersInfo[user].nom} ${castellersInfo[user].cognom}` : user

    return (
        <div
            style={{
                width: '90%',
            }}
        >
            <Pressable style={{ backgroundColor: '#eee' }} className="boto-back" href='/'>
                ← Tornar a la pàgina principal
            </Pressable>

            <h1>Historial de canvis</h1>

            <div
                style={{
                    display: 'flex',
                    flexDirection: 'row',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                }}
            >
                <h2>Últimes {nHores} hores</h2>

                <div
                    style={{
                        display: 'flex',
                        flexDirection: 'row',
                        alignItems: 'center',
                        marginLeft: 20,
                        gap: 5,
                        flexWrap: 'wrap',
                    }}
                >
                    <button onClick={() => setNHores(4)}>4h</button>
                    <button onClick={() => setNHores(8)}>8h</button>
                    <button onClick={() => setNHores(12)}>12h</button>
                    <button onClick={() => setNHores(24)}>24h</button>
                    <button onClick={() => setNHores(48)}>48h</button>
                    <button onClick={() => setNHores(72)}>72h</button>
                    <input
                        type="number"
                        min="1"
                        placeholder="Defineix hores"
                        onChange={(e) => parseInt(e.target.value) >= 1 ? setNHores(e.target.value) : undefined}
                    />
                </div>
            </div>

            <AuthorHistogram
                nHours={nHores}
                data={timestampedCanvis}
                castellersInfo={castellersInfo}
                events={events}
            />

            <Ranking
                ranking={ranking}
                nHores={nHores}
                displayName={displayShortName}
            />

            <LastChanges
                lastCanvis={lastCanvis}
                setNLastCanvis={setNLastCanvis}
                displayName={displayName}
                bundles={bundles}
                events={events}
            />

        </div>
    )
}

export default BlameApp;