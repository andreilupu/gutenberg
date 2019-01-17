/**
 * External dependencies
 */
import { create } from 'rungen';
import { map } from 'lodash';
import isPromise from 'is-promise';

/**
 * Internal dependencies
 */
import castError from './cast-error';
import { isActionOfType, isAction } from './is-action';

/**
 * Create a co-routine runtime.
 *
 * @param {Object}    controls Object of control handlers.
 * @param {function}  dispatch Unhandled action dispatch.
 *
 * @return {function} co-routine runtime
 */
export default function createRuntime( controls = {}, dispatch ) {
	const rungenControls = map( controls, ( control, actionType ) => ( value, next, iterate, yieldNext, yieldError ) => {
		if ( ! isActionOfType( value, actionType ) ) {
			return false;
		}
		const routine = control( value );
		if ( isPromise( routine ) ) {
			// Async control routine awaits resolution.
			routine.then(
				yieldNext,
				( error ) => yieldError( castError( error ) ),
			);
		} else {
			next( routine );
		}
		return true;
	} );

	const unhandledActionControl = ( value, next ) => {
		if ( ! isAction( value ) ) {
			return false;
		}
		dispatch( value );
		next();
		return true;
	};
	rungenControls.push( unhandledActionControl );

	const rungenRuntime = create( rungenControls );

	return ( action ) => new Promise( ( resolve, reject ) =>
		rungenRuntime( action, ( result ) => {
			if ( isAction( result ) ) {
				dispatch( result );
			}
			resolve( result );
		}, reject )
	);
}
