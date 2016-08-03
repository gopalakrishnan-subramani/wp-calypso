/**
 * External dependencies
 */
import React from 'react';

/**
 * Internal dependencies
 */
import Button from 'components/button';
import Gridicon from 'components/gridicon';
import olarkActions from 'lib/olark-store/actions';

export default React.createClass( {
	displayName: 'JetpackConnectLiveChatButton',

	handleClick() {
		olarkActions.expandBox();
	},

	render() {
		return (
			<div className="jetpack-connect__live-chat">
				<Button compact borderless onClick={ this.handleClick }>
					<Gridicon icon="help-outline" /> { this.translate( 'Help' ) }
				</Button>
			</div>
		);
	}
} );
