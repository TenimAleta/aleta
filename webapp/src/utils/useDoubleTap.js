import { useState, useCallback } from 'react';

export default function useDoubleTap(callback = (event) => {}, threshold = 300, options = {}) {
    const [timerId, setTimerId] = useState(null);

    const onPress = useCallback((event) => {
        if (!timerId) {
            // If single click, set a timeout to wait for a second click
            const id = setTimeout(
                () => setTimerId(null),
                threshold
            );
            setTimerId(id);

            if (options.singleTap) options.singleTap(event);
        } else {
            // If double click, clear the timeout and execute the callback
            clearTimeout(timerId);
            setTimerId(null);
            callback(event);
        }
    
        return () => {
            clearTimeout(timerId);
        };
    }, [callback, threshold, timerId]);
    
    return {
        onPointerUp: onPress,
    };
}