import moment from "moment";
import { applyTimeZone } from "../../interface/assistencia/LlistaAssistencies";
import { useState } from "react";
import SETTINGS from "../../../SETTINGS";

const displayName = (info) => {
    if (!info) return 'Anònim';
    if (info.mote) return info.mote;
    if (!info.nom) return 'Anònim';
    if (!info.cognom) return info.nom;
    return `${info.nom} ${info.cognom}`;
}

function CaixaTag({ colla, caixaId, setCaixaSelected }) {
    return (
        <div
            style={{
                borderRadius: 5,
                backgroundColor: SETTINGS(colla).color,
                fontSize: 12,
                padding: '3px 6px',
                cursor: 'pointer',
            }}
            onClick={() => setCaixaSelected(caixaId)}
        >
            {caixaId.slice(0,3)}
        </div>
    )
}

function LastChanges({ colla, posicionsLog, castellersInfo, userId, caixaSelected, setCaixaSelected }) {
    const [numToShow, setNumToShow] = useState(10);

    const parseLine = (line) => {
        const first_word = line.split(',')[0];

        if (first_word === 'FUSTES') {
            // TODO: parse fustes
            return line.split(',');
        }

        const [caixa, user, author, timestamp, actionId] = line.split(',');
        return [caixa, user !== '_EMPTY_' ? parseInt(user) : user, parseInt(author), timestamp, actionId];
    }

    const uniqueLog = posicionsLog
        ?.filter(line => line !== '')
        ?.filter(line => {
            if (!caixaSelected) return true;
            const [caixa, user, author, timestamp, actionId] = parseLine(line);
            return caixa === caixaSelected;
        })
        ?.reduce((acc, val) => {
            const [caixa, user, author, timestamp, actionId] = parseLine(val);
            const uniqueThing = `${caixa},${user},${author},${actionId}`;

            const isUnique = acc.every(line => {
                const [caixa2, user2, author2, timestamp2, actionId2] = parseLine(line);
                const uniqueThing2 = `${caixa2},${user2},${author2},${actionId2}`;
                return uniqueThing2 !== uniqueThing;
            })

            if (isUnique) acc.push(val);
            return acc;
        }, [])
        || []

    const parsedLog = uniqueLog.map(parseLine);

    const groupByActionId = (acc, [caixa, user, author, timestamp, actionId]) => {
        if (!acc[actionId]) acc[actionId] = [];
        acc[actionId].push([caixa, user, author, timestamp, actionId]);
        return acc;
    }

    const groupedLog = parsedLog.reduce(groupByActionId, {});

    const sortedByTimestamp = (a, b) => {
        const timestampA = a[0][3];
        const timestampB = b[0][3];
        return timestampA > timestampB ? -1 : 1;
    }

    const sortedLog = Object.values(groupedLog).sort(sortedByTimestamp);

    return (
        <div
            style={{
                flex: 1,
            }}
        >
            {
                sortedLog
                    .slice(0, numToShow)
                    .map((actions) => {
                        const nActions = [...new Set(actions)].length;

                        if (nActions === 1) {
                            const [caixa, user, author, timestamp, actionId] = actions[0];
                            const isEmpty = user === '_EMPTY_';
                            const isYou = parseInt(user) === parseInt(userId);

                            const casteller = !isEmpty ? castellersInfo?.[user] : null;
                            const authorCasteller = castellersInfo?.[author]

                            if (!casteller && !isEmpty) return null;

                            const timeOfAction = moment(timestamp);
                            if (!timeOfAction.isValid()) return null;

                            return isEmpty ? (
                                <div
                                    style={{
                                        margin: 10,
                                        padding: 10,
                                        backgroundColor: '#eee',
                                        borderRadius: 5,
                                    }}
                                >
                                    <div style={{ display: 'flex', flexDirection: 'row', gap: 10 }}>
                                        <div style={{ display: 'flex', alignItems: 'flex-start' }}><CaixaTag caixaId={caixa} setCaixaSelected={setCaixaSelected} colla={colla} /></div>
                                        <div>{displayName(authorCasteller)} ha buidat una caixa</div>
                                    </div>
                                    <div style={{ fontSize: 11, textAlign: 'right' }}>
                                        {timeOfAction.format('DD/MM HH:mm:ss')}
                                    </div>
                                </div>
                            ) : (
                                <div
                                    style={{
                                        margin: 10,
                                        padding: 10,
                                        backgroundColor: '#eee',
                                        borderRadius: 5,
                                    }}
                                >
                                    <div style={{ display: 'flex', flexDirection: 'row', gap: 10 }}>
                                        <div style={{ display: 'flex', alignItems: 'flex-start' }}><CaixaTag caixaId={caixa} setCaixaSelected={setCaixaSelected} colla={colla} /></div>
                                        <div>{displayName(authorCasteller)} ha posat a {displayName(casteller)}</div>
                                    </div>
                                    <div style={{ fontSize: 11, textAlign: 'right' }}>
                                        {timeOfAction.format('DD/MM HH:mm:ss')}
                                    </div>
                                </div>
                            )
                        } else if (nActions === 2) {
                            const thereIsADeletion = actions
                                .some(([caixa, user, author, timestamp, actionId]) => user === '_EMPTY_')
                            
                            const thereIsAnAddition = actions
                                .some(([caixa, user, author, timestamp, actionId]) => user !== '_EMPTY_')

                            const allAreAdditions = actions
                                .every(([caixa, user, author, timestamp, actionId]) => user !== '_EMPTY_')

                            const isMogut = thereIsADeletion && thereIsAnAddition;
                            const isSwap = allAreAdditions;

                            const victims = actions
                                .map(([caixa, user, author, timestamp, actionId]) => user)

                            const authors = actions
                                .map(([caixa, user, author, timestamp, actionId]) => author)
                                .map(author => parseInt(author))
                                .map(author => castellersInfo?.[author])

                            const caixes = actions
                                .map(([caixa, user, author, timestamp, actionId]) => caixa)

                            const timeOfAction = moment(actions?.[0]?.[3])
                            if (!timeOfAction.isValid()) return null;

                            return (
                                <div
                                    style={{
                                        margin: 10,
                                        padding: 10,
                                        backgroundColor: '#eee',
                                        borderRadius: 5,
                                    }}
                                >
                                    {
                                        isMogut ? (
                                            <div style={{ display: 'flex', gap: 10 }}>
                                                <div style={{ display: 'flex', gap: 5, alignItems: 'flex-start' }}>
                                                    {
                                                        caixes
                                                            .map(caixaId => <CaixaTag
                                                                caixaId={caixaId}
                                                                setCaixaSelected={setCaixaSelected}
                                                                colla={colla}
                                                            />)
                                                    }
                                                </div>
                                                <div>
                                                    {
                                                        displayName(authors?.[0]) 
                                                    }
                                                    {' '}
                                                    ha mogut a
                                                    {' '}
                                                    {
                                                        victims
                                                            .filter(victim => victim !== '_EMPTY_')
                                                            .map(victim => displayName(castellersInfo?.[victim]))
                                                            .join(', ')
                                                    }
                                                </div>
                                            </div>
                                        ) : isSwap ? (
                                            <div style={{ display: 'flex', gap: 10 }}>
                                                <div style={{ display: 'flex', gap: 5, alignItems: 'flex-start' }}>
                                                    {
                                                        caixes
                                                            .map(caixaId => <CaixaTag
                                                                caixaId={caixaId}
                                                                setCaixaSelected={setCaixaSelected}
                                                                colla={colla}
                                                            />)
                                                    }
                                                </div>
                                                <div>
                                                    {
                                                        displayName(authors?.[0])
                                                    }
                                                    {' '}
                                                    ha fet un swap de:
                                                    {' '}
                                                    {
                                                        victims
                                                            .filter(victim => victim !== '_EMPTY_')
                                                            .map(victim => displayName(castellersInfo?.[victim]))
                                                            .join(' i ')
                                                    }
                                                </div>
                                            </div>
                                        ) : null
                                    }
                                    <div style={{ fontSize: 11, textAlign: 'right' }}>
                                        {
                                            timeOfAction.format('DD/MM HH:mm:ss')
                                        }
                                    </div>
                                </div>
                            )
                        }
                    })
            }

            {
                numToShow < sortedLog.length && (
                    <button
                        style={{
                            margin: 10,
                            padding: 10,
                            width: '97%',
                        }}
                        onClick={() => setNumToShow(numToShow + 50)}
                    >
                        Mostra'n més
                    </button>
                )
            }
        </div>
    )
}

export default LastChanges;