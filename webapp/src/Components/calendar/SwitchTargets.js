import React, { useState } from 'react';
import Pressable from '../other/Pressable';

const SwitchTargets = ({ event, socket }) => {
    const targets = (event?.targets || "")
        .split(',')
        .map(target => target.trim())
        .filter(target => target !== '')

  const [selectedTargets, setSelectedTargets] = useState(targets);
  const [showForAllFutureEvents, setShowForAllFutureEvents] = useState(false);

  const changeTarget = (newTarget) => {
    setSelectedTargets(prevTargets => {
        if (newTarget === '') {
            setShowForAllFutureEvents(false)
            socket.emit('.change_event_targets', event.hash, '');
            return []
        } else if (prevTargets.includes(newTarget)) {
            setShowForAllFutureEvents(false)
            const newTargets = prevTargets.filter(target => target !== newTarget)
            socket.emit('.change_event_targets', event.hash, newTargets.join(','));
            return newTargets
        } else {
            if (newTarget === 'tècnica') {
              setShowForAllFutureEvents(true)
            } else {
              setShowForAllFutureEvents(false)
            }

            const newTargets = [...prevTargets, newTarget]
            socket.emit('.change_event_targets', event.hash, newTargets.join(','));
            return newTargets
        }
    });
  }

  const options = [
    { value: '', label: 'Tots' },
    { value: 'tècnica', label: 'Tècnica' },
    { value: 'junta', label: 'Junta' },
    { value: 'músics', label: 'Músics' },
  ];

  return (
    <div>
      <div
          style={{
              display: 'flex',
              flexDirection: 'row',
              justifyContent: 'center',
              alignItems: 'center',
          }}
      >
        {options.map((option) => (
          <div
            key={option.value}
            style={{
              padding: '10px',
              margin: '10px',
              borderRadius: '5px',
              cursor: 'pointer',
              backgroundColor: (option.label === 'Tots' && selectedTargets.length === 0) || selectedTargets.includes(option.value) ? 'lightgreen' : '#eee',
              color: (option.label === 'Tots' && selectedTargets.length === 0) || selectedTargets.includes(option.value) ? 'black' : 'black',
              textAlign: 'center',
            }}
            onClick={() => changeTarget(option.value)}
          >
            {option.label}
          </div>
        ))}
      </div>

      {
        showForAllFutureEvents &&
        <div>
          <h4>Vols posar privats per tècnica aquest esdeveniment i tots els següents?</h4>
          <div
            style={{
              display: 'flex',
              flexDirection: 'row',
              justifyContent: 'space-around',
              alignItems: 'center',
            }}
          >
            <Pressable style={{ padding: 10, borderRadius: 5, backgroundColor: '#eee', color: 'black' }} onClick={() => socket.emit('.add_target_to_all_future_events', event.hash, 'tècnica')}>Sí</Pressable>
            <Pressable style={{ padding: 10, borderRadius: 5, backgroundColor: '#eee', color: 'black' }} onClick={() => setShowForAllFutureEvents(false)}>No</Pressable>
          </div>
        </div>
      }
    </div>
  );
};

export default SwitchTargets;