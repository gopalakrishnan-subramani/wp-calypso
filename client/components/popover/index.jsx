/**
 * External dependencies
 */
import React, { PropTypes, Component } from 'react';
import ReactDOM from 'react-dom';
import debugFactory from 'debug';
import classNames from 'classnames';
import clickOutside from 'click-outside';
import uid from 'component-uid';

/**
 * Internal dependencies
 */
import RootChild from 'components/root-child';
import {
	bindWindowListeners,
	unbindWindowListeners,

	suggested as suggestPosition,
	constrainLeft,
	isElement as isDOMElement,
	offset
} from './util';

/**
 * Module variables
 */
const noop = () => {};
const debug = debugFactory( 'calypso:popover' );
const __popovers = new Set();

class Popover extends Component {
	constructor( props ) {
		super( props );

		this.setPopoverId( props.id );

		// bound methods
		this.setDOMBehavior = this.setDOMBehavior.bind( this );
		this.setPosition = this.setPosition.bind( this );
		this.onPopoverClickout = this.onPopoverClickout.bind( this );
		this.onKeydown = this.onKeydown.bind( this );
		this.onWindowChange = this.onWindowChange.bind( this );

		this.state = {
			show: props.isVisible,
			left: -99999,
			top: -99999,
			positionClass: `is-${ props.top }`
		};
	}

	componentDidMount() {
		this.bindEscKeyListener();
		this.bindDebouncedReposition();
		bindWindowListeners();
	}

	componentWillReceiveProps( nextProps ) {
		// update context (target) reference into a property
		if ( ! isDOMElement( nextProps.context ) ) {
			this.domContext = ReactDOM.findDOMNode( nextProps.context );
		} else {
			this.domContext = nextProps.context;
		}

		if ( ! nextProps.isVisible ) {
			return null;
		}

		this.setPosition();

		if ( ! this._clickoutHandlerReference ) {
			if ( nextProps.isVisible ) {
				this.bindClickoutHandler();
			} else {
				this.unbindClickoutHandler();
			}
		}
	}

	componentDidUpdate( prevProps ) {
		const { isVisible } = this.props;

		if ( isVisible !== prevProps.isVisible ) {
			if ( isVisible ) {
				this.show();
			} else {
				this.hide();
			}
		}

		if ( ! this.domContainer || ! this.domContext ) {
			return null;
		}

		if ( ! isVisible || isVisible === prevProps.isVisible ) {
			return null;
		}

		this.debug( 'Update position after inject DOM' );
		this.setPosition();
	}

	componentWillUnmount() {
		this.debug( 'unmounting .... ' );
		this.unbindClickoutHandler();
		this.unbindDebouncedReposition();
		this.unbindEscKeyListener();
		unbindWindowListeners();

		__popovers.delete( this.id );
		debug( 'current popover instances: ', __popovers.size );
	}

	// --- ESC key ---
	bindEscKeyListener() {
		if ( ! this.props.closeOnEsc ) {
			return null;
		}

		if ( this.escEventHandlerAdded ) {
			return null;
		}

		this.debug( 'adding escKey listener ...' );
		this.escEventHandlerAdded = true;
		document.addEventListener( 'keydown', this.onKeydown, true );
	}

	unbindEscKeyListener() {
		if ( ! this.props.closeOnEsc ) {
			return null;
		}

		if ( ! this.escEventHandlerAdded ) {
			return null;
		}

		this.debug( 'unbinding `escKey` listener ...' );
		document.removeEventListener( 'keydown', this.onKeydown, true );
	}

	onKeydown( event ) {
		if ( event.keyCode !== 27 ) {
			return null;
		}

		this.close();
	}

	// --- cliclout side ---
	bindClickoutHandler( el = this.domContainer ) {
		if ( ! el ) {
			this.debug( 'no element to bind clickout side ' );
			return null;
		}

		if ( this._clickoutHandlerReference ) {
			this.debug( 'clickout event already bound' );
			return null;
		}

		this.debug( 'binding `clickout` event' );
		this._clickoutHandlerReference = clickOutside( el, this.onPopoverClickout );
	}

	unbindClickoutHandler() {
		if ( this._clickoutHandlerReference ) {
			this.debug( 'unbinding `clickout` listener ...' );
			this._clickoutHandlerReference();
			this._clickoutHandlerReference = null;
		}
	}

	onPopoverClickout() {
		this.close();
	}

	// --- window `scroll` and `resize` ---
	bindDebouncedReposition() {
		window.addEventListener( 'scroll', this.onWindowChange, true );
		window.addEventListener( 'resize', this.onWindowChange, true );
	}

	unbindDebouncedReposition() {
		if ( this.willReposition ) {
			window.cancelAnimationFrame( this.willReposition );
			this.willReposition = null;
		}

		window.removeEventListener( 'scroll', this.onWindowChange, true );
		window.removeEventListener( 'resize', this.onWindowChange, true );
		this.debug( 'unbinding `debounce reposition` ...' );
	}

	onWindowChange() {
		this.willReposition = window.requestAnimationFrame( this.setPosition );
	}

	setDOMBehavior( domContainer ) {
		if ( ! domContainer ) {
			return null;
		}

		this.debug( 'setting DOM behavior' );

		// store DOM element referencies
		this.domContainer = domContainer;

		// store context (target) reference into a property
		if ( ! isDOMElement( this.props.context ) ) {
			this.domContext = ReactDOM.findDOMNode( this.props.context );
		} else {
			this.domContext = this.props.context;
		}

		this.setPosition();
		this.bindClickoutHandler( domContainer );
	}

	getPositionClass( position = this.props.position ) {
		return `is-${ position.replace( /\s+/g, '-' ) }`;
	}

	/**
	 * Computes the position of the Popover in function
	 * of its main container and the target.
	 *
	 * @return {Object} reposition parameters
	 */
	computePosition() {
		if ( ! this.props.isVisible ) {
			return null;
		}

		const { domContainer, domContext } = this;
		const { position } = this.props;

		if ( ! domContainer || ! domContext ) {
			this.debug( '[WARN] no DOM elements to work' );
			return null;
		}

		let suggestedPosition = position;

		this.debug( 'position: %o', position );

		if ( this.props.autoPosition ) {
			suggestedPosition = suggestPosition( position, domContainer, domContext );
			this.debug( 'suggested position: %o', suggestedPosition );
		}

		const reposition = Object.assign(
			{},
			constrainLeft(
				offset( suggestedPosition, domContainer, domContext ),
				domContainer
			),
			{ positionClass: this.getPositionClass( suggestedPosition ) }
		);

		this.debug( 'updating reposition: ', reposition );

		return reposition;
	}

	debug( string, ...args ) {
		debug( `[%s] ${ string }`, this.id, ...args );
	}

	setPopoverId( id ) {
		this.id = id || `pop__${ uid( 16 ) }`;
		__popovers.add( this.id );

		this.debug( 'creating ...' );
		debug( 'current popover instances: ', __popovers.size );
	}

	setPosition() {
		const position = this.computePosition();
		if ( ! position ) {
			return null;
		}

		this.willReposition = null;
		this.setState( position );
	}

	getStylePosition() {
		const { left, top } = this.state;
		return { left, top };
	}

	show() {
		if ( ! this.props.showDelay ) {
			this.setState( { show: true } );
			return null;
		}

		this.debug( 'showing in %o', `${ this.props.showDelay }ms` );
		this.clearShowTimer();

		this._openDelayTimer = setTimeout( () => {
			this.setState( { show: true } );
		}, this.props.showDelay );
	}

	hide() {
		this.setState( { show: false } );
		this.clearShowTimer();
	}

	clearShowTimer() {
		if ( ! this._openDelayTimer ) {
			return null;
		}

		clearTimeout( this._openDelayTimer );
		this._openDelayTimer = null;
	}

	close() {
		if ( ! this.props.isVisible ) {
			this.debug( 'popover should be already closed' );
			return null;
		}

		this.props.onClose();
	}

	render() {
		const { show } = this.state;

		if ( ! show ) {
			return null;
		}

		const { context, className } = this.props;

		if ( ! context ) {
			this.debug( 'No `context` to tie the Popover' );
			return null;
		}

		const classes = classNames(
			className,
			this.state.positionClass
		);

		this.debug( 'rendering ...' );

		return (
			<RootChild>
				<div
					style={ this.getStylePosition() }
					className={ classes }
					ref={ this.setDOMBehavior }
				>
					<div className="popover__arrow" />

					<div className="popover__inner">
						{ this.props.children }
					</div>
				</div>
			</RootChild>
		);
	}
}

Popover.propTypes = {
	autoPosition: PropTypes.bool,
	className: PropTypes.string,
	closeOnEsc: PropTypes.bool,
	id: PropTypes.string,
	position: PropTypes.string,
	showDelay: PropTypes.number,

	onClose: PropTypes.func.isRequired,
	onShow: PropTypes.func,
};

Popover.defaultProps = {
	autoPosition: true,
	className: 'popover__container',
	closeOnEsc: true,
	isVisible: false,
	position: 'top',
	showDelay: 0,

	onShow: noop,
};

export default Popover;
