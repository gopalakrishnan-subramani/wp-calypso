import { matches } from 'lodash/util';

export function isRequestingGuidedTransferStatus( state, siteId ) {
	return state.sites.guidedTransfer.isFetching[ siteId ] === true;
}

export function getGuidedTransferIssues( state, siteId ) {
	const gt = state.sites.guidedTransfer.status[ siteId ];
	if ( ! gt ) {
		return null;
	}

	return gt.issues;
}

/**
 * Returns true as long as there are no issues completely preventing a
 * Guided Transfer for a site from continuing.
 *
 * @param {any} state   The Redux store state
 * @param {any} siteId  The site ID to check
 * @returns {bool} true if the site is confirmed eligible for transfer, false otherwise
 */
export function isEligibleForGuidedTransfer( state, siteId ) {
	const issues = getGuidedTransferIssues( state, siteId );
	if ( issues === null ) {
		// No information available
		return false;
	}

	return ! issues.some( issue => issue.prevents_transfer );
}

export function getGuidedTransferIssue( state, siteId, options = {} ) {
	const issues = getGuidedTransferIssues( state, siteId );
	if ( issues === null ) {
		// No information available
		return false;
	}

	return issues.find( matches( options ) ) || null;
}
