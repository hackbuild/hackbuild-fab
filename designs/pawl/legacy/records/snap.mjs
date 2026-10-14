import RAPIER from '@dimforge/rapier3d-deterministic-compat';
import * as C from './core.mjs';
import {createHash} from 'node:crypto';
await RAPIER.init();
const {world,bodies,J}=C.makeWorld(RAPIER);
const P=C.defaults(); P.mode='stand';
const DT=world.timestep;
for(let n=0;n<Math.round(5/DT);n++){P.t+=DT;C.control(P,bodies,J,DT);world.step();}
const s=world.takeSnapshot();
console.log(s.length, createHash('sha256').update(s).digest('hex'));
world.free();
