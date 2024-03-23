import moment from 'moment';
import React, { useState, useEffect } from 'react';
import { applyTimeZone } from '../assistencia/LlistaAssistencies';
import { cordoToColor } from '../../editor/modes/cordons/CordoSetter';
import Pressable from "../../other/Pressable"

const getInitialsFromString = (str) => {
    const wordsToFilter = [
        'del',
        'la',
        'el',
        'i',
        'els',
        'les',
        'l\'',
        'd\'',
        'a',
        'al',
        'als',
        'amb',
    ]

    return str
        ?.split(' ')
        ?.filter(word => !wordsToFilter.includes(word.toLowerCase()))
        ?.map(word => word[0])
        ?.join('')
    || ''
}

const ResumTroncs = ({ data, order, assistencies, horesProves }) => {
  const [attendees, setAttendees] = useState({});
  const [proves, setProves] = useState([]);
  const [highlightedAttendee, setHighlightedAttendee] = useState(null);
  const [numToShow, setNumToShow] = useState(5);

  const orderedData = !order ? [] : order
    ?.filter(id => id in data)
    ?.map(id => ({
        ...data[id],
        key: id
    }))

  useEffect(() => {
    let provesSet = [];
    let attendeesObj = {};

    for(const prova of orderedData) {
      provesSet.push({
        key: prova.key,
        info: prova.prova
      });

      prova
        .caixesCastellers
        .forEach(([caixa, attendee]) => {
            if(attendeesObj[attendee.id]) {
                attendeesObj[attendee.id].proves.push(prova.key);
            } else {
                attendeesObj[attendee.id] = {
                    name: attendee.mote || `${attendee.nom} ${attendee.cognom[0]}.`,
                    proves: [prova.key]
                }
            }
        });
    }

    setAttendees(attendeesObj);
    setProves([...provesSet]);
  }, [data, order]);

  const dontShow = proves.length === 0 || Object.keys(attendees).length === 0;

  return !dontShow && (
    <div>
      <h2>Resum de troncs</h2>
      <div
        style={{
            overflowX: 'auto',
            paddingBottom: 10,
        }}
      >
        <table
            style={{
                borderCollapse: 'collapse',
            }}
        >
            <thead>
            <tr>
                <th>Casteller</th>
                {proves.map((prove, index) => <th key={index}>
                    {prove?.info?.shortName || getInitialsFromString(prove?.info?.nom)}
                </th>)}
            </tr>
            </thead>
            <tbody>
            {
                Object.entries(attendees)
                .sort((a,b) => a[1].proves.length > b[1].proves.length ? -1 : 1)
                .slice(0, numToShow)
                .map(([id, attendee], attendeeIdx) => {
                    const assist = assistencies
                        .find(assist => assist.id === parseInt(id))
                        ?.['assistència']

                    const dataentrada = assistencies
                        .find(assist => assist.id === parseInt(id))
                        ?.['data-entrada']
                    
                    const entrada = dataentrada && applyTimeZone(dataentrada).isValid() ?
                        applyTimeZone(dataentrada).format('HH:mm') :
                        null

                    const datasortida = assistencies
                        .find(assist => assist.id === parseInt(id))
                        ?.['data-sortida']

                    const sortida = datasortida && applyTimeZone(datasortida).isValid() ?
                        applyTimeZone(datasortida).format('HH:mm') :
                        null

                    const arribaACastell =
                        (entrada && sortida) ? horesProves
                            .map(([inici, fi]) => entrada <= inici && sortida >= fi) :
                        (entrada && !sortida) ? horesProves
                            .map(([inici, fi]) => entrada <= inici) :
                        (!entrada && sortida) ? horesProves
                            .map(([inici, fi]) => sortida >= fi) :
                        horesProves
                            .map(([inici, fi]) => assist > 0)

                    return (
                        <tr
                            key={id}
                            style={{
                                whiteSpace: 'nowrap',
                                backgroundColor:
                                    highlightedAttendee === id ? 'rgb(255 252 220)' :
                                    'transparent',
                            }}
                            onClick={() => {
                                setHighlightedAttendee(
                                    prev => prev === id ? null : id
                                );
                            }}
                        >
                            <td
                                style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                }}
                            >
                                <div
                                    style={{
                                        display: 'flex',
                                        fontSize: 11,
                                        padding: 3,
                                        backgroundColor: cordoToColor(attendee.proves.length + 1),
                                        color: [2,3,5].includes(attendee.proves.length + 1) ? '#333' : 'white',
                                        borderRadius: 4,
                                        marginRight: 8,
                                        alignItems: 'center',
                                    }}
                                >
                                    {attendee.proves.length}
                                </div>

                                <div
                                    style={{
                                        color:
                                            assist === 2 ? 'darkblue' :
                                            assist === 1 ? 'green' :
                                            assist === 0 ? 'rgb(200, 80, 80)' :
                                            assist === null ? 'darkorange' :
                                            'black',
                                    }}
                                >
                                    {attendee.name}
                                </div>

                                <div
                                    style={{
                                        display: entrada ? 'flex' : 'none',
                                        fontSize: 9,
                                        padding: 2,
                                        margin: 3,
                                        backgroundColor: 'rgb(255, 50, 50)',
                                        borderRadius: 4,
                                        color: 'white'
                                    }}
                                >
                                    🛬 {entrada}
                                </div>

                                <div
                                    style={{
                                        display: sortida ? 'flex' : 'none',
                                        fontSize: 9,
                                        padding: 2,
                                        margin: 3,
                                        backgroundColor: 'rgb(255, 50, 50)',
                                        borderRadius: 4,
                                        color: 'white'
                                    }}
                                >
                                    🛫 {sortida}
                                </div>
                            </td>
                            {proves.map((prove, index) => (
                            <td 
                                key={index}
                            >
                                <div
                                    style={{
                                        display: 'flex',
                                        flexDirection: 'column',
                                        justifyContent: 'center',
                                        alignItems: 'center',
                                    }}
                                >
                                    <div
                                        style={{
                                            width: 20,
                                            height: 20,
                                            borderRadius: 5,
                                            backgroundColor:
                                                attendee.proves.includes(prove.key) ? (
                                                    assist > 0 && !arribaACastell[index]  ? 'rgb(200, 80, 80)' :
                                                    assist === 2 ? 'darkblue' :
                                                    assist === 1 ? 'green' :
                                                    assist === 0 ? 'rgb(200, 80, 80)' :
                                                    assist === null ? 'orange' :
                                                    'black'
                                                ) :
                                                !arribaACastell[index]  ? 'rgb(255, 200, 200)' :
                                                '#ddd',
                                        }}
                                    >
                                        {/* {attendee.proves.includes(prove.key) ? '✓' : '×'} */}
                                    </div>
                                </div>
                            </td>
                            ))}
                        </tr>
                    )
                })
            }
            </tbody>
        </table>
        {
            Object.keys(attendees).length > numToShow && (
                <Pressable
                    style={{
                        width: '97%',
                        marginTop: 15,
                        backgroundColor: '#ddd',
                        color: 'black',
                        padding: 10,
                        textAlign: 'center',
                        borderRadius: 5,
                        fontSize: 14,
                    }}
                    onClick={() => setNumToShow(Object.keys(attendees).length)}
                >
                    Mostra'ls tots
                </Pressable>
            )
        }
        {
            numToShow > 5 && (
                <Pressable
                    style={{
                        width: '97%',
                        marginTop: 15,
                        backgroundColor: '#ddd',
                        color: 'black',
                        padding: 10,
                        textAlign: 'center',
                        borderRadius: 5,
                        fontSize: 14,
                    }}
                    onClick={() => setNumToShow(5)}
                >
                    Mostra'n menys
                </Pressable>
            )
        }
      </div>
    </div>
  );
};

export default ResumTroncs;