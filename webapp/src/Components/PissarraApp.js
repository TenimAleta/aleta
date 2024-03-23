import Pissarra from './pissarra/Pissarra'
import Controller from './pissarra/controller/Controller'
import FloatingButtons from './pissarra/floating/FloatingButtons'
import PissarraController from './pissarra/PissarraController'
import './PissarraApp.css'

import { rebuildPosicions, applyChange } from '../utils/loadPositions'
import { useState, useEffect } from 'react';
import Importer from './pissarra/importer/Importer'
import { isBrowser } from 'react-device-detect'
import PissarraAids from './pissarra/PissarraAids'

import moment from 'moment'
import { NoSignal } from './Interface'
import Projector from './pissarra/projector/Projector'
import ReadOnlyButtons from './pissarra/readonly/ReadOnlyButtons'
import { applyTimeZone } from './interface/assistencia/LlistaAssistencies'
import { fetchAPI, fetchAPIquery, getSubdomain } from '../utils/utils'
import { addAddons } from './editor/EditorApp'

const COLLA = getSubdomain()

function PissarraApp({ castellersInfo, setCastellersInfo, socket, readonly, serverId, setServerId, ...props }) {
  // API variables
  const params = window.location.pathname.split('/').filter(part => part != '');
  const isInProjector = params.length > 0 && ['esdeveniments', 'assaigs', 'activitats', 'actuacions'].includes(params[0]);

  const defaultEvent = isInProjector ? params[1] : params[0];
  const defaultCastell = isInProjector ? params[2] : params[1];
  const defaultVersio = isInProjector ? params[3] : params[2];

  const [selectedEvent, setSelectedEvent] = useState(defaultEvent || null);
  const [selectedBundle, setSelectedBundle] = useState(defaultCastell || null);
  const [selectedVersio, setSelectedVersio] = useState(defaultVersio || null);

  const [castellerSelected, setCastellerSelected] = useState(-1);
  const [caixaSelected, setCaixaSelected] = useState(-1);
  const [pz, setPanzoom] = useState(null);
  const [swiper, setSwiper] = useState(null);
  const [posicions, setPosicions] = useState({ 'caixes': {}, 'castellers': {}, 'loading': true });
  const [posicionsLog, setPosicionsLog] = useState(null);
  const [assistenciesEvent, setAssistenciesEvent] = useState(null)

  const [lastCaixes, setLastCaixes] = useState({ 'prev': -1, 'current': -1 });
  const [ajuntament, setAjuntament] = useState(null);
  const [hideAjuntament, setHideAjuntament] = useState(true);
  const [extended, setExtended] = useState(false);

  const [selectedEventInfo, setSelectedEventInfo] = useState(null)
  const [horesProves, setHoresProves] = useState(null)

  const [rotationVal, setRotationVal] = useState(0);
  const [importing, setImporting] = useState(null);

  const [targetEvent, setTargetEvent] = useState(null)
  const [targetAssistencies, setTargetAssistencies] = useState(null)

  const [pestanya, setPestanya] = useState('Pinya')
  const [tabs, setTabs] = useState([])

  const [addons, setAddons] = useState(null)
  const [json, setJSON] = useState({});

  const [triggerClick, setTriggerClick] = useState(false)
  const [castellBeingImported, setCastellBeingImported] = useState(null)

  const [lastLlista, setLastLlista] = useState(null)

  const MODELS_EVENT_ID = 999999
  const isModel = parseInt(selectedEvent) === parseInt(MODELS_EVENT_ID)

  const withAddons = addAddons(json, addons);

  const matchedProva = (horesProves || [])
    .filter(hores => {
        const [castell, versio, _] = hores.prova.split('.')
        return selectedBundle === castell && selectedVersio === versio
    })
    [0] || null

  const arribenTard = (assistenciesEvent || [])
    .filter(data => moment(data['data-entrada']).isValid())
    .filter(data => parseInt(data['assistència']) === 1)
    .filter(data => matchedProva ? moment(matchedProva.start) < applyTimeZone(data['data-entrada']) : false)
    .map(data => parseInt(data.id))

  const surtenAviat = (assistenciesEvent || [])
    .filter(data => moment(data['data-sortida']).isValid())
    .filter(data => parseInt(data['assistència']) === 1 || parseInt(data['assistència']) === 2)
    .filter(data => matchedProva ? applyTimeZone(data['data-sortida']) < moment(matchedProva.end) : false)
    .map(data => parseInt(data.id))

  const openLlista = () => {
    if (swiper && swiper.realIndex === 0) {
      if (lastLlista && !isNaN(lastLlista)) {
        swiper.slideTo(lastLlista, 0);
      } else {
        console.log('lmaooo')
        swiper.slideTo(1, 0);
      }
    }
  }

  const exports = {
    'socket': socket,

    'selectedEvent': selectedEvent,
    'selectedBundle': selectedBundle,
    'selectedVersio': selectedVersio,

    'lastLlista': lastLlista,
    'setLastLlista': setLastLlista,
    'openLlista': openLlista,
    
    'json': json,
    'setJSON': setJSON,
    'addons': addons,
    'setAddons': setAddons,

    'swiper': swiper,
    'setSwiper': setSwiper,
    'panzoom': pz,
    'setPanzoom': setPanzoom,
    'castellerSelected': castellerSelected,
    'setCastellerSelected': setCastellerSelected,
    'caixaSelected': caixaSelected,
    'setCaixaSelected': setCaixaSelected,
    'posicions': posicions,
    'setPosicions': setPosicions,
    'posicionsLog': posicionsLog,
    'setPosicionsLog': setPosicionsLog,
    'castellersInfo': castellersInfo,
    'setCastellersInfo': setCastellersInfo,
    'readonly': readonly,
    'lastCaixes': lastCaixes,
    'setLastCaixes': setLastCaixes,

    'assistenciesEvent': assistenciesEvent,
    'setAssistenciesEvent': setAssistenciesEvent,

    'setSelectedEvent': setSelectedEvent,
    'setSelectedBundle': setSelectedBundle,
    'setSelectedVersio': setSelectedVersio,

    'castellBeingImported': castellBeingImported,
    'setCastellBeingImported': setCastellBeingImported,
    'importing': importing,
    'setImporting': setImporting,

    'ajuntament': ajuntament,
    'setAjuntament': setAjuntament,
    'hideAjuntament': hideAjuntament,
    'setHideAjuntament': setHideAjuntament,
    'extended': extended,
    'setExtended': setExtended,

    'selectedEventInfo': selectedEventInfo,
    'horesProves': horesProves,

    'rotationVal': rotationVal,
    'setRotationVal': setRotationVal,

    'arribenTard': arribenTard,
    'surtenAviat': surtenAviat,
    'matchedProva': matchedProva,

    'targetEvent': targetEvent,
    'setTargetEvent': setTargetEvent,
    'targetAssistencies': targetAssistencies,
    'setTargetAssistencies': setTargetAssistencies,

    'pestanya': pestanya,
    'setPestanya': setPestanya,
    'tabs': tabs,
    'setTabs': setTabs,

    'triggerClick': triggerClick,
    'setTriggerClick': setTriggerClick,
    'isModel': isModel,

    'serverId': serverId,
    'setServerId': setServerId,

    'withAddons': withAddons,

    ...props
  };

  useEffect(() => {
    if (selectedBundle !== null && selectedVersio !== null) {
      // document.title = `${selectedBundle} ${readonly ? '(🎥) ' : '' }- Aleta`;
    } else if (selectedBundle === null) {
      document.title = `Projector - Aleta`;
      setExtended(true);
    }

    socket.on('.new_connection', id => setServerId(id));

    return () => socket.off('.new_connection');
  }, [selectedBundle, selectedVersio]);

  const parametrizeOption = (name, options) =>
    options
      ?.replace('OPTIONS:', '')
      ?.split(',')
      ?.map(str => str.split('='))
      ?.filter(([key, val]) => key === name)
      ?.map(([key, val]) => parseInt(val))
      ?.filter(val => !isNaN(val))
      [0] || 0

  useEffect(() => {
    if (selectedEvent) fetchAPI(`/all_assistencies_event/${selectedEvent}`, data => setAssistenciesEvent(data.data), false)
  }, [selectedEvent])

  useEffect(() => {
    if (targetEvent) fetchAPI(`/all_assistencies_event/${targetEvent}`, data => setTargetAssistencies(data.data), false)
  }, [targetEvent])

  // useEffect(() => {
  //     fetchAPIquery(`/positions/${selectedEvent}/${selectedBundle}/${selectedVersio}`, (res) => {
  //       if ('url' in res) {
  //           fetch(res.url)
  //               .then(data => data.text())
  //               .then(data => {
  //                   if (data.split('\n').length > 0) {
  //                       setAjuntament(parametrizeOption('ajuntament', data.split('\n')[0]))
  //                       setPosicionsLog(data.split('\n').slice(1))
  //                   }
  //               })
  //       }
  //   }, false, false, {
  //       force_disk: 0
  //   })
  // }, [selectedEvent, selectedBundle, selectedVersio])

  useEffect(() => {
    if (selectedEvent && selectedBundle && selectedVersio) socket.emit('.prova_info', selectedEvent, selectedBundle, selectedVersio);
    if (selectedEvent) socket.emit('.request_hores_proves', selectedEvent)
    if (selectedEvent) socket.emit('.request_event', selectedEvent)

    if (selectedEvent && selectedBundle && selectedVersio) socket.emit('.load_positions', selectedEvent, selectedBundle, selectedVersio);

    socket.on('.loaded_positionsv2', res => {
      if (res.event === selectedEvent && res.castell === selectedBundle && res.versio === selectedVersio) {
          if (res.data.split('\n').length > 0) {
              setAjuntament(parametrizeOption('ajuntament', res.data.split('\n')[0]))
              setPosicionsLog(res.data.split('\n').slice(1))
          }
      }
  });

    socket.on('.undid_action', action_id => socket.emit('.load_positions', selectedEvent, selectedBundle, selectedVersio))

    socket.on('.new_order', () => {
      socket.emit('.request_hores_proves', selectedEvent)
    })

    socket.on('.user_change', () => fetchAPI('/castellersInfo', setCastellersInfo, false))

    socket.on('.confirmat', res => {
      const assistenciaNum = res.assistencia === 'Fitxat' ? 2 :
        res.assistencia === 'Vinc' ? 1 :
        res.assistencia === 'No vinc' ? 0 :
        undefined

      if (parseInt(res.event) === parseInt(selectedEvent)) {
        setAssistenciesEvent(prev => {
          return [...(prev || [])].map(
            (data) => parseInt(data.id) === parseInt(res.user) ?
              { ...data, 'assistencia': res.assistencia, 'assistència': assistenciaNum, 'entrada': res?.entrada, 'sortida': res?.sortida } :
              data
          )
        })
      } else if (parseInt(res.event) === parseInt(targetEvent)) {
        setTargetAssistencies(prev => {
          return [...prev].map(
            (data) => parseInt(data.id) === parseInt(res.user) ?
              { ...data, 'assistencia': res.assistencia, 'assistència': assistenciaNum, 'entrada': res?.entrada, 'sortida': res?.sortida } :
              data
          )
        })
      }
    }
    );
    socket.on('.new_change', pos => applyChange(exports, pos));
    socket.on('.event', data => data.id === selectedEvent && setSelectedEventInfo(data))
    socket.on('.hores_proves', (event, data) => parseInt(event) === parseInt(selectedEvent) && setHoresProves(data))

    return () => {
      socket.off('.confirmat');
      socket.off('.loaded_positionsv2');
      socket.off('.new_change');
      socket.off('.event');
      socket.off('.hores_proves')
      socket.off('.user_change');
      socket.off('.new_order');
      socket.off('.undid_action')
    }
  }, [targetEvent, selectedEvent, selectedBundle, selectedVersio, serverId]);

  useEffect(() => {
    if (!importing) {
      setCastellBeingImported(null)
    }
  }, [importing])

  useEffect(() => {
    if (posicionsLog === null) return;
    
    setPosicions(rebuildPosicions(exports))
  }, [posicionsLog]);

  useEffect(() => {
    if (Object.keys(withAddons).length === 0) return;
    if (posicions.loading) return;

    const pisosRellevants = ['pinya', 'folre', 'manilles', 'puntals']

    const isPisPintat = Object.fromEntries(
      pisosRellevants
        .map(pis => {
          const doesPisExist = Object.values(withAddons)
            .filter(caixa => typeof caixa === 'object')
            .filter(caixa => caixa?.pestanya?.toLowerCase() === pis.toLowerCase())
            .length >= 1

          if (!doesPisExist) return [pis, true]

          const isActualPisPintat = Object.keys(posicions['caixes'])
            .map(caixa => withAddons[caixa])
            .filter(caixa => typeof caixa === 'object')
            .filter(caixa => caixa?.pestanya?.toLowerCase() === pis.toLowerCase())
            .filter(caixa => !('pilar' in caixa))
            .length >= 1

          return [pis, isActualPisPintat]
        })
    )

    const nonTroncCaixesOccupied = Object.keys(posicions['caixes'])
      .map(caixa => withAddons[caixa])
      .filter(caixa => typeof caixa === 'object')
      .filter(caixa => !('pilar' in caixa) && caixa?.pestanya?.toLowerCase() !== 'tronc')

    const totalCaixesOccupied = Object.keys(posicions['caixes'])
      .map(caixa => withAddons[caixa])
      .filter(caixa => typeof caixa === 'object') 

    const isProvaNetaPintada = totalCaixesOccupied.length >= 1
    const isActualPestanyaPintada = isPisPintat[pestanya.toLowerCase()] === true

    const isProvaNeta = !['pinya', 'folre', 'manilles', 'puntals'].includes(pestanya.toLowerCase())
    const isProvaPintada = isProvaNeta ? isProvaNetaPintada : isActualPestanyaPintada

    if (importing !== false && !isProvaPintada) {
      if (selectedBundle && selectedVersio) {
        setImporting(true)
      }
    }
  }, [withAddons, posicions, pestanya])

  return (
    <>
      <NoSignal socket={socket} />
      {!readonly && importing && <Importer parametrizeOption={parametrizeOption} {...exports} />}
      {(!readonly) && !importing && <FloatingButtons {...exports} />}
      { readonly && <ReadOnlyButtons {...exports} /> }
      {!readonly && <PissarraController {...exports} />}
      { selectedBundle && selectedVersio && !importing && <PissarraAids {...exports} /> }
      <Pissarra {...exports} />
      {!readonly && !importing && <Controller {...exports} />}
      {readonly && <Projector {...exports} />}
    </>
  );
}

export default PissarraApp;
