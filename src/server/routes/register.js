/*
 * Copyright (C) 2015  Ben Ockmore
 *               2015  Sean Burke
 *               2015  Annie Zhou
 *
 * This program is free software; you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation; either version 2 of the License, or
 * (at your option) any later version.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU General Public License for more details.
 *
 * You should have received a copy of the GNU General Public License along
 * with this program; if not, write to the Free Software Foundation, Inc.,
 * 51 Franklin Street, Fifth Floor, Boston, MA 02110-1301 USA.
 */

'use strict';

const React = require('react');
const ReactDOMServer = require('react-dom/server');
const express = require('express');

const Editor = require('bookbrainz-data').Editor;
const EditorType = require('bookbrainz-data').EditorType;

const handler = require('../helpers/handler');

const FormSubmissionError = require('../helpers/error').FormSubmissionError;

const RegisterAuthPage = React.createFactory(
	require('../../client/components/pages/registrationAuth.jsx')
);
const RegisterDetailPage = React.createFactory(
	require('../../client/components/forms/registrationDetails.jsx')
);
const auth = require('../helpers/auth');
const loadGenders = require('../helpers/middleware').loadGenders;

const router = express.Router();
const _ = require('lodash');

router.get('/', (req, res) =>
	res.render('page', {
		title: 'Register',
		markup: ReactDOMServer.renderToString(RegisterAuthPage())
	})
);
	});

router.get('/details', loadGenders, (req, res) => {
	if (!req.session.mbProfile) {
		res.redirect('/auth');
	}

	const gender = _.find(res.locals.genders, {
		name: _.capitalize(req.session.mbProfile.gender)
	});

	const props = {
		name: req.session.mbProfile.sub,
		gender,
		genders: res.locals.genders
	};

	return res.render('registrationDetails', {
		title: 'Register',
		props,
		markup: ReactDOMServer.renderToString(RegisterDetailPage(props))
	});
});

router.post('/handler', (req, res) => {
	if (!req.session.mbProfile) {
		res.redirect('/auth');
	}

	// Fetch the default EditorType from the database
	const registerPromise = EditorType.forge({label: 'Editor'})
		.fetch({require: true})
		.then((editorType) =>
			// Create a new Editor and add to the database
			new Editor({
				name: req.body.displayName,
				typeId: editorType.id,
				genderId: req.body.gender,
				birthDate: req.body.birthday,
				metabrainzUserId: req.session.mbProfile.metabrainz_user_id,
				cachedMetabrainzName: req.session.mbProfile.sub
			})
			.save()
		)
		.then((editor) => {
			req.session.mbProfile = null;
			return editor.toJSON();
		})
		.catch(() => {
			throw new FormSubmissionError(
				'Something went wrong when registering, please try again!'
			);
		});

	handler.sendPromiseResult(res, registerPromise);
});

module.exports = router;
