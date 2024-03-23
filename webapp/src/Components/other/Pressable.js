import React, { useState } from 'react';

const Pressable = ({ _onPressColor, style, href, ...attrs }) => {
  const [pressed, setPressed] = useState(false);
  const onPressColor = _onPressColor || '#ccc';

  const bgColor = pressed ? onPressColor :
    style?.backgroundColor ? style?.backgroundColor :
    'transparent'

  const press = () => {
    setPressed(true);
  };

  const unpress = () => {
    setPressed(false);
  };

  return href ? (
    <a
      href={href}
      style={{
        textDecoration: 'none',
        color: '#000',
        ...style,
        backgroundColor: bgColor,
        userSelect: 'none',
        cursor: 'pointer'
      }}
      onPointerDown={press}
      onPointerUp={unpress}
      onPointerLeave={unpress}
      onPointerCancel={unpress}
      onPointerOut={unpress}
      {...attrs}
    />
  ) : (
    <div
      onPointerDown={press}
      onPointerUp={unpress}
      onPointerLeave={unpress}
      onPointerCancel={unpress}
      onPointerOut={unpress}
      style={{ ...style, backgroundColor: bgColor, userSelect: 'none', cursor: 'pointer' }}
      {...attrs}
    />
  );
};

export default Pressable;