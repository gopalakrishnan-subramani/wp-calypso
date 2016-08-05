/**
 * External dependencies
 */
import page from 'page';

/**
 * Internal dependencies
 */
import controller from 'my-sites/controller';
import paladinController from './controller';
import config from 'config';

module.exports = function() {
	// TODO: make a new config for this
	if ( config.isEnabled( 'manage/customize' ) ) {
		page( '/paladin', controller.siteSelection, controller.sites );
		page( '/paladin/:domain', controller.siteSelection, controller.navigation, paladinController.activate );
	}
};

