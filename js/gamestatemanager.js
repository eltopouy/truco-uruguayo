/**
 * Motor lógico para Truco Uruguayo.
 * Maneja el mazo, reparto, piezas (y regla del Alcahuete), matriz de poder dinámica y cálculo de Envido/Flor.
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
    constructor() {
        this.mazo = [];
        this.manoJugador = [];
        this.manoOponente = [];
        this.idRonda = 0; // Identificador único para disparar animaciones de reparto
        this.manoInicialJugador = [];
        this.manoInicialOponente = [];
        this.muestra = null;
        this.paloMuestra = null;
        
        this.mesa = { jugador: null, oponente: null };
        this.manosGanadas = { jugador: 0, oponente: 0, empates: 0 };
        this.registroBazas = []; // Historial visual
        this.turno = 'jugador'; // A quién le toca jugar esta minironda
        this.rondaTerminada = false;
        
        // Arquitectura Nueva: Partido a 30 puntos
        this.puntosPartido = { jugador: 0, oponente: 0 };
        this.fase = 'cantos'; // Fases: 'cantos' -> 'truco'
        this.envidoCantado = false; // Bloquea cantar envido 2 veces por ronda
        this.manoDelPartido = 'jugador'; // Quién reparte y quién es MANO
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
            piezaDeducida: null, 
            cartasJugadasRival: []
        };
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
            this.manoDelPartido = this.manoDelPartido === 'jugador' ? 'oponente' : 'jugador';
        } else {
            this.partidoIniciado = true;
            this.partidoFinalizado = false;
            this.manoDelPartido = 'jugador';
        }

        this.crearMazo();
        this.mezclarMazo();

        // Resetear mesa
        this.mesa = { jugador: null, oponente: null };
        this.manosGanadas = { jugador: 0, oponente: 0, empates: 0 };
        this.registroBazas = [];
        this.rondaTerminada = false;
        this.turno = this.manoDelPartido;
        this.fase = 'cantos';
        this.envidoCantado = false;
        
        // Resetear memoria de la IA para la nueva ronda
        this.memoriaRival = {
            puntosEnvido: null,
            tieneFlor: false,
            piezaDeducida: null,
            cartasJugadasRival: []
        };
        
        // Formato inicial de apuesta 'no cantada = 1 pt'
        this.apuestaTruco = { valor: 1, estado: 'nada', turnoCantar: 'ambos' };

        // Reparto de 3 cartas a cada jugador (una a una, alternando desde el 'Mano')
        this.manoJugador = [];
        this.manoOponente = [];
        for (let i = 0; i < 3; i++) {
            if (this.manoDelPartido === 'jugador') {
                this.manoJugador.push(this.mazo.pop());
                this.manoOponente.push(this.mazo.pop());
            } else {
                this.manoOponente.push(this.mazo.pop());
                this.manoJugador.push(this.mazo.pop());
            }
        }

        // Carta de la Muestra
        this.muestra = this.mazo.pop();
        this.paloMuestra = this.muestra.palo;

        // Definir cuáles son las piezas matemáticas de esta mano
        this.definirPiezas();

        // Actualizar la jerarquía (poder) y puntos de envido para todas las cartas en juego
        this.actualizarMatrizDePoder(...this.manoJugador, ...this.manoOponente);

        // Guardar copia inmutable de las manos para cantos desfasados de Envido/Flor
        this.manoInicialJugador = [...this.manoJugador];
        this.manoInicialOponente = [...this.manoOponente];
    }

    definirPiezas() {
        // Por defecto, las piezas son los valores bases del palo de la muestra
        this.piezasActivas = [...this.piezasBase];

        // REGLA DEL ALCAHUETE
        // Si la muestra es una de las piezas base, el 12 de ese palo toma su lugar natural
        const indexAlcahuete = this.piezasActivas.indexOf(this.muestra.valor);
        if (indexAlcahuete !== -1) {
            this.piezasActivas[indexAlcahuete] = 12;
        }
    }

    actualizarMatrizDePoder(...cartas) {
        // Resetea y define dinámicamente el poder y propiedades de cada carta repartida
        cartas.forEach(carta => {
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
        
        let piezas = mano.filter(c => c.esPieza);
        piezas.sort((a, b) => b.puntosEnvido - a.puntosEnvido); // Ordenadas de mejor a peor pieza
        
        let comunes = mano.filter(c => !c.esPieza);

        let tieneFlor = false;
        let puntosEnvido = 0;
        let tipoCalculo = '';

        // -- CHEQUEO DE FLOR (Obligatoria en Truco Uruguayo) --
        // Condición 1: Tres cartas del mismo palo
        if (mano.length === 3 && mano[0].palo === mano[1].palo && mano[1].palo === mano[2].palo) tieneFlor = true;
        // Condición 2: Dos piezas (cualquier tercera carta, asumiendo 3 en la mano inicial real, pero en el bucle puede quedar menos)
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
                // Es Solo ENVIDO, por lo que es la Pieza + la carta SUELTA más alta de las restantes.
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

    jugarCarta(quien, indexCarta) {
        if (this.rondaTerminada) return false;
        if (this.turno !== quien) return false;

        // Si tiran carta, se quema la fase de cantos silenciosamente
        if (this.fase === 'cantos') this.fase = 'truco';

        let carta = null;
        if (quien === 'jugador') {
            carta = this.manoJugador.splice(indexCarta, 1)[0];
            this.mesa.jugador = carta;
            this.turno = 'oponente';
        } else {
            carta = this.manoOponente.splice(indexCarta, 1)[0];
            this.mesa.oponente = carta;
            this.turno = 'jugador';
        }
        return carta;
    }

    evaluarMesa() {
        if (!this.mesa.jugador || !this.mesa.oponente) return null; // Faltan jugar

        let ganador = null;
        let pJugador = this.mesa.jugador.poder;
        let pOponente = this.mesa.oponente.poder;

        if (pJugador > pOponente) {
            ganador = 'jugador';
            this.manosGanadas.jugador++;
            this.turno = 'jugador'; // El que gana, sale
        } else if (pOponente > pJugador) {
            ganador = 'oponente';
            this.manosGanadas.oponente++;
            this.turno = 'oponente';
        } else {
            ganador = 'empate';
            this.manosGanadas.empates++;
            // En empate el turno vuelve a quien era "Mano" original de toda la ronda
            this.turno = this.manoDelPartido; 
        }

        this.registroBazas.push(ganador);

        // Limpiar la mesa para la próxima "baza" (enfrentamiento)
        this.mesa.jugador = null;
        this.mesa.oponente = null;

        // Comprobar ganador definitivo (Parda, 2 ganadas, etc)
        const gJ = this.manosGanadas.jugador;
        const gO = this.manosGanadas.oponente;
        const emp = this.manosGanadas.empates;
        const bazasTotales = gJ + gO + emp;

        // Reglas oficiales de Truco para definición de manos
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
                // Empate en primera: el que gane cualquier otra, gana.
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
            return { ganadorMesa: ganador, ganadorRonda: this.manoDelPartido };
        }

        // Falla de seguridad (no debería ocurrir nunca)
        if (bazasTotales === 3) {
            this.rondaTerminada = true;
            return { ganadorMesa: ganador, ganadorRonda: this.manoDelPartido };
        }

        return { ganadorMesa: ganador, ganadorRonda: null };
    }

    // --- MÉTODOS DE APOYO PARA IA (SISTEMA DE DECISIÓN) ---
    
    evaluarPoderMano(mano) {
        if (!mano || mano.length === 0) return 0;
        // El poder de la mano se calcula sumando el poder de las cartas restantes
        // y dándole un peso explosivo a las piezas.
        let total = 0;
        mano.forEach(c => {
            if (c.esPieza) total += (c.poder * 2); // Factor determinante
            else total += c.poder;
        });
        return total;
    }

    obtenerMejorRespuesta(mano, poderRival) {
        // Estratégicamente: Buscar la carta más baja que gane al rival.
        // Si ninguna gana, devolver la más baja posible (regalar la mano).
        let ganadoras = mano.filter(c => c.poder > poderRival);
        if (ganadoras.length > 0) {
            ganadoras.sort((a, b) => a.poder - b.poder); // De menor a mayor poder
            return ganadoras[0]; // La más baja de las que ganan
        }
        // No hay ganadoras, devolver la peor carta para no quemar piezas/matas
        let todas = [...mano].sort((a, b) => a.poder - b.poder);
        return todas[0];
    }

    recordarPuntosRival(puntos, tieneFlor) {
        this.memoriaRival.puntosEnvido = puntos;
        this.memoriaRival.tieneFlor = tieneFlor;

        // Deducción de Piezas (Reglas de Truco Uruguayo)
        // 30 -> 2 | 29 -> 4 | 28 -> 5 | 27 -> 10 u 11
        if (puntos === 30) this.memoriaRival.piezaProbable = 2;
        else if (puntos === 29) this.memoriaRival.piezaProbable = 4;
        else if (puntos === 28) this.memoriaRival.piezaProbable = 5;
        else if (puntos === 27) this.memoriaRival.piezaProbable = 11; // Perico/a
        else if (puntos > 30) this.memoriaRival.piezaProbable = 'fuerte'; // Pieza + carta alta
    }
}
