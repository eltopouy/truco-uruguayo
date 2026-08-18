/**
 * Motor lógico universal para Truco Uruguayo (1 vs 1 y 2 vs 2).
 * Maneja 2 o 4 jugadores, asientos (seats 0..3), equipos (teams 0..1),
 * reparto alternado, piezas dinámicas (con regla del Alcahuete),
 * matriz de poder, cálculo de Envido/Flor individual y por equipos,
 * y resolución de bazas y pardas.
 */

const PALOS = ['Espada', 'Basto', 'Oro', 'Copa'];
const VALORES = [1, 2, 3, 4, 5, 6, 7, 10, 11, 12]; // Sin 8 y 9

class Carta {
    constructor(valor, palo) {
        this.valor = valor;
        this.palo = palo;
        // Atributos dinámicos calculados por ronda
        this.esPieza = false;
        this.poder = 0; // Jerarquía en el juego (mayor es mejor)
        this.puntosEnvido = 0; // Puntos fijos al calcular envido/flor
        this.oculto = false;
    }

    toString() {
        return `${this.valor} de ${this.palo}`;
    }

    getNombreCriollo(paloMuestra, piezasActivas) {
        if (!paloMuestra || !piezasActivas) return this.toString();
        
        // ¿Es una pieza de la muestra?
        if (this.palo === paloMuestra) {
            const indexPieza = piezasActivas.indexOf(this.valor);
            if (indexPieza !== -1) {
                if (this.valor === 11) return `¡El Perico! 🦜`;
                if (this.valor === 10) return `¡La Perica! 💃`;
                if (this.valor === 12) return `¡El Alcahuete! 👑`;
                
                if (this.valor === 2) return `El Dos de la Muestra ⭐`; 
                if (this.valor === 4) return `El Cuatro de la Muestra ⭐`; 
                if (this.valor === 5) return `El Cinco de la Muestra ⭐`; 
            }
        }
        
        // Cartas Mayores Universales (Matapuercos)
        if (this.valor === 1 && this.palo === 'Espada') return 'El Macho (As de Espadas) 🗡️';
        if (this.valor === 1 && this.palo === 'Basto') return 'El Bastillo (As de Bastos) 🪵';
        if (this.valor === 7 && this.palo === 'Espada') return 'Siete Bravo (7 Espada) 🗡️';
        if (this.valor === 7 && this.palo === 'Oro') return 'Siete Bello (7 Oro) 🟡';
        
        // Cartas Comunes
        let v = this.valor.toString();
        if (this.valor === 12) v = "Rey (Negra 🖤)";
        if (this.valor === 11) v = "Caballo (Negra 🖤)";
        if (this.valor === 10) v = "Sota (Negra 🖤)";
        if (this.valor === 1) v = "As Falso";
        
        return `${v} de ${this.palo}`;
    }
}

class GameStateManager {
    constructor(numJugadores = 2) {
        this.numJugadores = (numJugadores === 4) ? 4 : 2;
        this.mazo = [];
        this.idRonda = 0; // Identificador único de ronda
        this.muestra = null;
        this.paloMuestra = null;
        
        // Inicialización de Jugadores (Asientos y Equipos)
        // Seat 0: TÚ (Team 0)
        // Seat 1: Rival 1 / Rival Mano a Mano (Team 1)
        // Seat 2: Compañero (Team 0) [solo en 4P]
        // Seat 3: Rival 2 (Team 1) [solo en 4P]
        this.players = [];
        this.configurarJugadores(this.numJugadores);
        
        // Mesa: ranuras indexadas por asiento (0..numJugadores-1)
        this.mesa = { jugador: null, oponente: null }; // Objeto legacy
        this.mesaSlots = new Array(this.numJugadores).fill(null);
        
        this.manosGanadas = { jugador: 0, oponente: 0, empates: 0 };
        this.registroBazas = []; // Historial visual
        
        this.turnoSeat = 0; // Asiento al que le toca jugar (0..3)
        this.manoSeat = 0;  // Asiento que es Mano en la ronda (0..3)
        this.rondaTerminada = false;
        
        // Partido a 30 o 40 puntos
        this.puntosPartido = { jugador: 0, oponente: 0 };
        this.fase = 'cantos'; // Fases: 'cantos' -> 'truco'
        this.envidoCantado = false; // Bloquea cantar envido 2 veces por ronda
        this.partidoIniciado = false;
        this.partidoFinalizado = false;
        
        // Jerarquía y Apuestas del Truco
        this.apuestaTruco = { valor: 1, estado: 'nada', turnoCantar: 'ambos' };

        // Ajustes Globales de la Partida
        this.config = {
            limitePuntos: 30,
            nombreJugador: "TÚ",
            nombreOponente: "RIVAL",
            mostrarAyuda: true
        };

        // El Rey (12) actúa como comodín (Alcahuete) si la muestra es una pieza base
        this.piezasBase = [2, 4, 5, 11, 10]; 
        this.piezasActivas = []; // Almacena el valor de los números que son piezas en la ronda
        
        // Memoria para la IA (Deducción humana)
        this.memoriaRival = {
            puntosEnvido: null,
            tieneFlor: false,
            piezaProbable: null,
            cartasJugadasRival: []
        };

        // Perfil persistente del rival durante el PARTIDO
        this.perfilRival = {
            frecuenciaTruco: 0,
            bluffsDetectados: 0,
            agresividad: 0.5,
            totalCantos: 0
        };

        // Memoria de palos quemados para deducción probabilística
        this.memoriaPalos = { Espada: 0, Basto: 0, Oro: 0, Copa: 0 };
    }

    // --- Getters y Setters de Compatibilidad 1v1 ---
    get manoJugador() {
        return (this.players[0] && this.players[0].hand) ? this.players[0].hand : [];
    }
    set manoJugador(arr) {
        if (!this.players[0]) this.players[0] = { id: 'p0', seat: 0, team: 0, name: 'TÚ', hand: [], initialHand: [], isBot: false };
        this.players[0].hand = arr || [];
    }

    get manoOponente() {
        return (this.players[1] && this.players[1].hand) ? this.players[1].hand : [];
    }
    set manoOponente(arr) {
        if (!this.players[1]) this.players[1] = { id: 'p1', seat: 1, team: 1, name: 'RIVAL', hand: [], initialHand: [], isBot: true };
        this.players[1].hand = arr || [];
    }

    get manoInicialJugador() {
        return (this.players[0] && this.players[0].initialHand) ? this.players[0].initialHand : [];
    }
    set manoInicialJugador(arr) {
        if (this.players[0]) this.players[0].initialHand = arr || [];
    }

    get manoInicialOponente() {
        return (this.players[1] && this.players[1].initialHand) ? this.players[1].initialHand : [];
    }
    set manoInicialOponente(arr) {
        if (this.players[1]) this.players[1].initialHand = arr || [];
    }

    get turno() {
        return this.turnoSeat === 0 ? 'jugador' : 'oponente';
    }
    set turno(val) {
        if (typeof val === 'number') {
            this.turnoSeat = val % this.numJugadores;
        } else {
            this.turnoSeat = (val === 'jugador' || val === 0) ? 0 : 1;
        }
    }

    get manoDelPartido() {
        return this.manoSeat === 0 ? 'jugador' : 'oponente';
    }
    set manoDelPartido(val) {
        if (typeof val === 'number') {
            this.manoSeat = val % this.numJugadores;
        } else {
            this.manoSeat = (val === 'jugador' || val === 0) ? 0 : 1;
        }
    }

    configurarJugadores(num = 2) {
        this.numJugadores = (num === 4) ? 4 : 2;
        this.mesaSlots = new Array(this.numJugadores).fill(null);
        
        if (this.numJugadores === 4) {
            this.players = [
                { id: 'p0', seat: 0, team: 0, name: this.config?.nombreJugador || 'TÚ', hand: [], initialHand: [], isBot: false },
                { id: 'p1', seat: 1, team: 1, name: 'Rival Derecha', hand: [], initialHand: [], isBot: true },
                { id: 'p2', seat: 2, team: 0, name: 'Compañero', hand: [], initialHand: [], isBot: true },
                { id: 'p3', seat: 3, team: 1, name: 'Rival Izquierda', hand: [], initialHand: [], isBot: true }
            ];
        } else {
            this.players = [
                { id: 'p0', seat: 0, team: 0, name: this.config?.nombreJugador || 'TÚ', hand: [], initialHand: [], isBot: false },
                { id: 'p1', seat: 1, team: 1, name: this.config?.nombreOponente || 'RIVAL', hand: [], initialHand: [], isBot: true }
            ];
        }
    }

    crearMazo() {
        this.mazo = [];
        for (let palo of PALOS) {
            for (let valor of VALORES) {
                this.mazo.push(new Carta(valor, palo));
            }
        }
    }

    mezclarMazo() {
        for (let i = this.mazo.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [this.mazo[i], this.mazo[j]] = [this.mazo[j], this.mazo[i]];
        }
    }

    iniciarRonda() {
        this.idRonda++;
        if (this.partidoIniciado) {
            // Rotación cíclica de la Mano alrededor de la mesa
            this.manoSeat = (this.manoSeat + 1) % this.numJugadores;
        } else {
            this.partidoIniciado = true;
            this.partidoFinalizado = false;
            this.manoSeat = 0;
        }

        this.crearMazo();
        this.mezclarMazo();

        // Resetear mesa y bazas
        this.mesa = { jugador: null, oponente: null };
        this.mesaSlots = new Array(this.numJugadores).fill(null);
        this.manosGanadas = { jugador: 0, oponente: 0, empates: 0 };
        this.registroBazas = [];
        this.rondaTerminada = false;
        this.turnoSeat = this.manoSeat; // Empieza el Mano
        this.fase = 'cantos';
        this.envidoCantado = false;
        
        // Resetear memoria de la IA para la nueva ronda
        this.memoriaRival = {
            puntosEnvido: null,
            tieneFlor: false,
            piezaProbable: null,
            cartasJugadasRival: []
        };
        this.memoriaPalos = { Espada: 0, Basto: 0, Oro: 0, Copa: 0 };
        
        // Formato inicial de apuesta 'no cantada = 1 pt'
        this.apuestaTruco = { valor: 1, estado: 'nada', turnoCantar: 'ambos' };

        // Limpiar manos de todos los jugadores
        this.players.forEach(p => {
            p.hand = [];
            p.initialHand = [];
        });

        // Reparto de 3 cartas a cada jugador (una a una, en orden a partir del Mano)
        for (let round = 0; round < 3; round++) {
            for (let s = 0; s < this.numJugadores; s++) {
                const targetSeat = (this.manoSeat + s) % this.numJugadores;
                const card = this.mazo.pop();
                if (card && this.players[targetSeat]) {
                    this.players[targetSeat].hand.push(card);
                }
            }
        }

        // Carta de la Muestra
        this.muestra = this.mazo.pop();
        this.paloMuestra = this.muestra ? this.muestra.palo : null;

        // Definir cuáles son las piezas matemáticas de esta mano
        this.definirPiezas();

        // Actualizar la jerarquía (poder) y puntos de envido para todas las cartas repartidas
        const todasLasCartas = [];
        this.players.forEach(p => todasLasCartas.push(...p.hand));
        this.actualizarMatrizDePoder(...todasLasCartas);

        // Guardar copia inmutable de las manos para cantos desfasados de Envido/Flor
        this.players.forEach(p => {
            p.initialHand = [...p.hand];
        });
    }

    definirPiezas() {
        // Por defecto, las piezas son los valores bases del palo de la muestra
        this.piezasActivas = [...this.piezasBase];

        // REGLA DEL ALCAHUETE
        // Si la muestra es una de las piezas base, el 12 de ese palo toma su lugar natural
        if (this.muestra) {
            const indexAlcahuete = this.piezasActivas.indexOf(this.muestra.valor);
            if (indexAlcahuete !== -1) {
                this.piezasActivas[indexAlcahuete] = 12;
            }
        }
    }

    actualizarMatrizDePoder(...cartas) {
        // Resetea y define dinámicamente el poder y propiedades de cada carta repartida
        cartas.forEach(carta => {
            if (!carta) return;
            carta.esPieza = false;
            carta.poder = this.obtenerPoderEstandar(carta);
            carta.puntosEnvido = carta.valor >= 10 ? 0 : carta.valor; // Figuras = 0, resto = su número

            if (carta.palo === this.paloMuestra) {
                const indexPieza = this.piezasActivas.indexOf(carta.valor);
                if (indexPieza !== -1) {
                    carta.esPieza = true;
                    // Las piezas tienen un poder inmensamente superior al truco estándar
                    // El índice 0 (Generalmente el 2) es la carta más fuerte
                    carta.poder = 100 - indexPieza; 
                    
                    // Asignación de Puntos de Envido según puesto de Pieza (2=30, 4=29, 5=28, 11=27, 10=27)
                    if (indexPieza === 0) carta.puntosEnvido = 30;
                    else if (indexPieza === 1) carta.puntosEnvido = 29;
                    else if (indexPieza === 2) carta.puntosEnvido = 28;
                    else carta.puntosEnvido = 27; // Perico y Perica
                }
            }
        });
    }

    obtenerPoderEstandar(carta) {
        if (!carta) return 0;
        // Jerarquía normal del truco (sin pensar en piezas)
        if (carta.valor === 1 && carta.palo === 'Espada') return 20;
        if (carta.valor === 1 && carta.palo === 'Basto') return 19;
        if (carta.valor === 7 && carta.palo === 'Espada') return 18;
        if (carta.valor === 7 && carta.palo === 'Oro') return 17;
        if (carta.valor === 3) return 16;
        if (carta.valor === 2) return 15;
        if (carta.valor === 1 && (carta.palo === 'Copa' || carta.palo === 'Oro')) return 14;
        if (carta.valor === 12) return 13;
        if (carta.valor === 11) return 12;
        if (carta.valor === 10) return 11;
        if (carta.valor === 7 && (carta.palo === 'Basto' || carta.palo === 'Copa')) return 10;
        if (carta.valor === 6) return 9;
        if (carta.valor === 5) return 8;
        if (carta.valor === 4) return 7;
        return 0;
    }

    calcularPuntosEnvidoFlor(mano) {
        if (!mano || mano.length === 0) return { tieneFlor: false, puntos: 0, tipo: '-' };
        
        let piezas = mano.filter(c => c && c.esPieza);
        piezas.sort((a, b) => b.puntosEnvido - a.puntosEnvido); // Ordenadas de mejor a peor pieza
        
        let comunes = mano.filter(c => c && !c.esPieza);

        let tieneFlor = false;
        let puntosEnvido = 0;
        let tipoCalculo = '';

        // -- CHEQUEO DE FLOR (Obligatoria en Truco Uruguayo) --
        // Condición 1: Tres cartas del mismo palo
        if (mano.length === 3 && mano[0].palo === mano[1].palo && mano[1].palo === mano[2].palo) tieneFlor = true;
        // Condición 2: Dos piezas
        if (piezas.length >= 2) tieneFlor = true;
        // Condición 3: Una pieza + dos cartas del mismo palo (no necesario que sean del palo de la pieza)
        if (piezas.length === 1 && comunes.length >= 2 && comunes[0].palo === comunes[1].palo) tieneFlor = true;

        // -- CÁLCULO DE PUNTOS --
        if (piezas.length > 0) {
            let maxPieza = piezas[0].puntosEnvido;
            
            if (tieneFlor) {
                // Cálculo especial para la Flor con Pieza(s)
                puntosEnvido = maxPieza;
                
                // Si hay más piezas, suman solo la unidad (regla uruguaya de resto de piezas)
                for (let i = 1; i < piezas.length; i++) {
                    puntosEnvido += (piezas[i].puntosEnvido % 10);
                }
                
                // Además, suman TODAS las cartas comunes que tengas (figuras no-pieza valen 0)
                comunes.forEach(c => {
                    puntosEnvido += c.puntosEnvido;
                });
                
                tipoCalculo = 'Flor con Pieza(s)';
            } else {
                // Es Solo ENVIDO: la Pieza + la carta SUELTA más alta de las restantes.
                let ptsAdicionales = 0;
                
                if (piezas.length >= 2) {
                    ptsAdicionales = piezas[1].puntosEnvido % 10;
                } else if (comunes.length > 0) {
                    ptsAdicionales = Math.max(...comunes.map(c => c.puntosEnvido));
                }
                
                puntosEnvido = maxPieza + ptsAdicionales;
                tipoCalculo = 'Envido con Pieza';
            }
        } else {
            // Sin Piezas (Envido Común y Flor Común)
            let gruposPalo = {};
            comunes.forEach(c => {
                if (!gruposPalo[c.palo]) gruposPalo[c.palo] = [];
                gruposPalo[c.palo].push(c);
            });

            for (let palo in gruposPalo) {
                let grupo = gruposPalo[palo];
                if (grupo.length >= 2) {
                    grupo.sort((a, b) => b.puntosEnvido - a.puntosEnvido);
                    
                    let ptos = 20 + grupo[0].puntosEnvido + grupo[1].puntosEnvido;
                    
                    // Si es Flor común de ese palo, sumamos la tercera carta también
                    if (tieneFlor && grupo.length === 3) {
                        ptos += grupo[2].puntosEnvido;
                    }
                    
                    if (ptos > puntosEnvido) puntosEnvido = ptos;
                    tipoCalculo = tieneFlor ? 'Flor Común' : 'Envido Común';
                }
            }

            // Si no tiene nada combinable (cartas de diferente palo y sin piezas) -> Envido 'Ciego'
            if (puntosEnvido === 0) {
                puntosEnvido = Math.max(...comunes.map(c => c.puntosEnvido));
                tipoCalculo = 'Solo (Sin Mismo Palo)';
            }
        }

        return { tieneFlor, puntos: puntosEnvido, tipo: tipoCalculo };
    }

    calcPuntosFalta() {
        // En Uruguay: "Falta envido son los puntos que le faltan al equipo que va primero para terminar el partido".
        const maxPts = Math.max(this.puntosPartido.jugador, this.puntosPartido.oponente);
        const ptsFalta = this.config.limitePuntos - maxPts;
        return ptsFalta > 0 ? ptsFalta : 1; // Mínimo 1 punto
    }

    // --- LÓGICA DE JUEGO EN MESA (TRUCO) ---

    jugarCarta(quienOrSeat, indexCarta) {
        if (this.rondaTerminada) return false;

        let seat = 0;
        if (typeof quienOrSeat === 'number') {
            seat = quienOrSeat;
        } else if (quienOrSeat === 'jugador') {
            seat = 0;
        } else if (quienOrSeat === 'oponente') {
            seat = 1;
        }

        if (this.turnoSeat !== seat) return false;
        const player = this.players[seat];
        if (!player || !player.hand || player.hand.length <= indexCarta) return false;

        // Si tiran carta, se quema la fase de cantos silenciosamente
        if (this.fase === 'cantos') this.fase = 'truco';

        const carta = player.hand.splice(indexCarta, 1)[0];
        this.mesaSlots[seat] = carta;

        // Mantener compatibilidad con mesa legacy
        if (seat === 0) {
            this.mesa.jugador = carta;
            this.registrarAccionRival('carta', carta);
        } else if (seat === 1) {
            this.mesa.oponente = carta;
        }

        // Pasar turno al siguiente asiento en orden
        this.turnoSeat = (seat + 1) % this.numJugadores;

        return carta;
    }

    evaluarMesa() {
        // Sincronizar mesa legacy si fue asignada directamente como propiedad
        if (this.mesa) {
            if (this.mesa.jugador && !this.mesaSlots[0]) this.mesaSlots[0] = this.mesa.jugador;
            if (this.mesa.oponente && !this.mesaSlots[1]) this.mesaSlots[1] = this.mesa.oponente;
        }

        // Verificar que todos los jugadores activos hayan tirado carta en la baza
        const cartasJugadas = this.mesaSlots.filter(c => c !== null);
        if (cartasJugadas.length < this.numJugadores) return null; // Faltan jugar

        // Determinar la carta más alta de cada equipo
        let maxPoderTeam0 = -1;
        let maxSeatTeam0 = -1;
        let maxPoderTeam1 = -1;
        let maxSeatTeam1 = -1;

        for (let seat = 0; seat < this.numJugadores; seat++) {
            const carta = this.mesaSlots[seat];
            if (!carta) continue;
            const team = this.players[seat].team;

            if (team === 0) {
                if (carta.poder > maxPoderTeam0) {
                    maxPoderTeam0 = carta.poder;
                    maxSeatTeam0 = seat;
                }
            } else {
                if (carta.poder > maxPoderTeam1) {
                    maxPoderTeam1 = carta.poder;
                    maxSeatTeam1 = seat;
                }
            }
        }

        let ganador = null; // 'jugador' (Team 0), 'oponente' (Team 1), o 'empate'

        if (maxPoderTeam0 > maxPoderTeam1) {
            ganador = 'jugador';
            this.manosGanadas.jugador++;
            // El jugador que tiró la carta más alta sale jugando en la próxima baza
            this.turnoSeat = maxSeatTeam0;
        } else if (maxPoderTeam1 > maxPoderTeam0) {
            ganador = 'oponente';
            this.manosGanadas.oponente++;
            this.turnoSeat = maxSeatTeam1;
        } else {
            ganador = 'empate';
            this.manosGanadas.empates++;
            // En empate el turno vuelve a quien era "Mano" original de la ronda
            this.turnoSeat = this.manoSeat; 
        }

        this.registroBazas.push(ganador);

        // Limpiar la mesa para la próxima baza
        this.mesaSlots = new Array(this.numJugadores).fill(null);
        this.mesa.jugador = null;
        this.mesa.oponente = null;

        // Comprobar ganador definitivo (Parda, 2 ganadas, etc.)
        const gJ = this.manosGanadas.jugador;
        const gO = this.manosGanadas.oponente;
        const emp = this.manosGanadas.empates;
        const bazasTotales = gJ + gO + emp;

        // Reglas oficiales de Truco para definición de rondas
        if (gJ >= 2) {
            this.rondaTerminada = true;
            return { ganadorMesa: ganador, ganadorRonda: 'jugador' };
        }
        if (gO >= 2) {
            this.rondaTerminada = true;
            return { ganadorMesa: ganador, ganadorRonda: 'oponente' };
        }
        
        // Si hay al menos un empate (parda)
        if (emp >= 1) {
            if (this.registroBazas[0] === 'empate') {
                // Empate en primera: el que gane cualquier otra baza, gana la ronda
                if (gJ === 1) { this.rondaTerminada = true; return { ganadorMesa: ganador, ganadorRonda: 'jugador' }; }
                if (gO === 1) { this.rondaTerminada = true; return { ganadorMesa: ganador, ganadorRonda: 'oponente' }; }
            } else {
                // Empate en segunda o tercera: gana el que ganó la primera
                if (this.registroBazas[0] === 'jugador') { this.rondaTerminada = true; return { ganadorMesa: ganador, ganadorRonda: 'jugador' }; }
                if (this.registroBazas[0] === 'oponente') { this.rondaTerminada = true; return { ganadorMesa: ganador, ganadorRonda: 'oponente' }; }
            }
        }
        
        // Triple parda
        if (emp === 3) {
            this.rondaTerminada = true;
            const manoTeam = this.players[this.manoSeat] ? this.players[this.manoSeat].team : 0;
            return { ganadorMesa: ganador, ganadorRonda: (manoTeam === 0 ? 'jugador' : 'oponente') };
        }

        // Falla de seguridad (no debería ocurrir)
        if (bazasTotales === 3) {
            this.rondaTerminada = true;
            const manoTeam = this.players[this.manoSeat] ? this.players[this.manoSeat].team : 0;
            return { ganadorMesa: ganador, ganadorRonda: (manoTeam === 0 ? 'jugador' : 'oponente') };
        }

        return { ganadorMesa: ganador, ganadorRonda: null };
    }

    // --- MÉTODOS DE APOYO PARA IA (SISTEMA DE DECISIÓN) ---
    
    evaluarPoderMano(mano) {
        if (!mano || mano.length === 0) return 0;
        let total = 0;
        mano.forEach(c => {
            if (!c) return;
            if (c.esPieza) total += (c.poder * 2);
            else total += c.poder;
        });
        return total;
    }

    obtenerMejorRespuesta(mano, poderRival) {
        let ganadoras = mano.filter(c => c && c.poder > poderRival);
        if (ganadoras.length > 0) {
            ganadoras.sort((a, b) => a.poder - b.poder);
            return ganadoras[0]; // La más baja de las que ganan
        }
        let todas = [...mano].sort((a, b) => a.poder - b.poder);
        return todas[0];
    }

    recordarPuntosRival(puntos, tieneFlor) {
        this.memoriaRival.puntosEnvido = puntos;
        this.memoriaRival.tieneFlor = tieneFlor;

        if (puntos === 30) this.memoriaRival.piezaProbable = 2;
        else if (puntos === 29) this.memoriaRival.piezaProbable = 4;
        else if (puntos === 28) this.memoriaRival.piezaProbable = 5;
        else if (puntos === 27) this.memoriaRival.piezaProbable = 11;
        else if (puntos > 30) this.memoriaRival.piezaProbable = 'fuerte';
    }

    registrarAccionRival(tipo, data) {
        if (tipo === 'canto') {
            this.perfilRival.totalCantos++;
            if (data === 'truco') this.perfilRival.frecuenciaTruco++;
        }
        if (tipo === 'carta' && data && data.palo) {
            this.memoriaPalos[data.palo]++;
        }
    }

    analizarBluff(puntosRival, cantado) {
        if (cantado && puntosRival < 20) {
            this.perfilRival.bluffsDetectados++;
            this.perfilRival.agresividad += 0.1;
        }
    }
}

// Compatibilidad con entorno Node.js / Jest / Node test runner
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { Carta, GameStateManager, PALOS, VALORES };
}
