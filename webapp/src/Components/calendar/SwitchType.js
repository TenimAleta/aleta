import React, { useState } from 'react';

const SwitchType = ({ event, socket }) => {
  const [selectedType, setSelectedType] = useState(event.tipus);

  const changeType = (newType) => {
    setSelectedType(newType);
    socket.emit('.change_event_tipus', event.hash, newType);
  }

  const options = [
    { value: 'assaig', label: 'Assaig' },
    { value: 'actuació', label: 'Actuació' },
    { value: 'activitat', label: 'Activitat' },
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
      {options.map((option) => (
        <div
          key={option.value}
          style={{
            padding: '10px',
            margin: '10px',
            borderRadius: '5px',
            cursor: 'pointer',
            backgroundColor: selectedType === option.value ? 'lightblue' : '#eee',
            color: selectedType === option.value ? 'black' : 'black',
            textAlign: 'center',
          }}
          onClick={() => changeType(option.value)}
        >
          {option.label}
        </div>
      ))}
    </div>
  );
};

export default SwitchType;