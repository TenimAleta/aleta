import React, { useState } from 'react';
import Pressable from '../../other/Pressable';

const ShortSwitchTargets = ({ event, socket, userInfo }) => {
    const isCapDeTecnica = userInfo?.es_tecnica >= 2

    const targets = (event?.targets || "")
        .split(',')
        .map(target => target.trim())
        .filter(target => target !== '')

  const [selectedTargets, setSelectedTargets] = useState(targets);

  const changeTarget = (newTarget) => {
    setSelectedTargets(prevTargets => {
        if (newTarget === '') {
            socket.emit('.change_event_targets', event.hash, '');
            return []
        } else if (prevTargets.includes(newTarget)) {
            const newTargets = prevTargets.filter(target => target !== newTarget)
            socket.emit('.change_event_targets', event.hash, newTargets.join(','));
            return newTargets
        } else {
            const newTargets = [...prevTargets, newTarget]
            socket.emit('.change_event_targets', event.hash, newTargets.join(','));
            return newTargets
        }
    });
  }

  const switchTarget = () => {
    setSelectedTargets(prevTargets => {
      if (prevTargets.includes('junta')) {
        const newTargets = prevTargets.filter(target => target !== 'junta')
        socket.emit('.change_event_targets', event.hash, newTargets.join(','));
        return newTargets
      } else if (prevTargets.includes('tècnica')) {
        const newTargets = prevTargets.filter(target => target !== 'tècnica')
        socket.emit('.change_event_targets', event.hash, newTargets.join(','));
        return newTargets
      } else {
        const newTargets = [...prevTargets, 'tècnica']
        socket.emit('.change_event_targets', event.hash, newTargets.join(','));
        return newTargets
      }
    })
  }

  const options = [
    // { value: '', label: 'Tots' },
    { value: 'tècnica', label: 'Tècnica' },
    // { value: 'junta', label: 'Junta' },
    // { value: 'músics', label: 'Músics' },
  ];

  return (
    <div
        style={{
            display: 'flex',
            flexDirection: 'row',
            justifyContent: 'center',
            alignItems: 'center',
        }}
    >
        <Pressable
          style={{
            padding: '6px 10px',
            margin: '5px',
            marginBottom: '15px',
            borderRadius: '4px',
            fontSize: 12,
            cursor: 'pointer',
            backgroundColor: selectedTargets.includes('tècnica') || selectedTargets.includes('junta') ? 'lightgreen' : '#eee',
            color: selectedTargets.includes('tècnica') || selectedTargets.includes('junta') ? 'black' : 'black',
            textAlign: 'center',
          }}
          onClick={() => isCapDeTecnica ? switchTarget() : undefined}
        >
          {
            selectedTargets.includes('tècnica') && selectedTargets.includes('junta') ? '🔓 Només s\'hi pot apuntar junta i tècnica' :
            selectedTargets.includes('junta') ? '🔓 Només s\'hi pot apuntar junta' :
            selectedTargets.includes('tècnica') ? '🔒 Només s\'hi pot apuntar tècnica' :
            '🌐 S\'hi pot apuntar tothom'
          }
        </Pressable>
    </div>
  );
};

export default ShortSwitchTargets;