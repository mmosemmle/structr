/*
 * Copyright (C) 2010-2017 Structr GmbH
 *
 * This file is part of Structr <http://structr.org>.
 *
 * Structr is free software: you can redistribute it and/or modify
 * it under the terms of the GNU Affero General Public License as
 * published by the Free Software Foundation, either version 3 of the
 * License, or (at your option) any later version.
 *
 * Structr is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU Affero General Public License for more details.
 *
 * You should have received a copy of the GNU Affero General Public License
 * along with Structr.  If not, see <http://www.gnu.org/licenses/>.
 */
var s = require('../setup');

var testName = '001_failed_login';
var heading = "Failed Login", sections = [];
var desc = "This animation shows what happens if an incorrect username/password combination was entered.";
var numberOfTests = 2;

s.startRecording(window, casper, testName);

casper.test.begin(testName, numberOfTests, function(test) {

	casper.start(s.url);

	sections.push('If you enter a wrong combination of username and password, the system does not allow you to log in.');

	casper.waitForSelector('#usernameField').then(function() {
		casper.wait(200);
		s.animatedType(this, '#usernameField', false, 'wrong');
	});

	casper.waitForSelector('#passwordField').then(function() {
		s.animatedType(this, '#passwordField', false, 'wrong');
	});

	casper.then(function() {
		s.mousePointer(casper, { left: 600, top: 400 });
	});

	casper.then(function() {
		s.moveMousePointerAndClick(casper, {selector: "#loginButton", wait: 0});
	});

	casper.waitForSelector('#errorText', function() {
		test.assertSelectorHasText('#errorText', 'Wrong username or password!');
		test.assertNotVisible('#dashboard');
	});

	casper.then(function() {
		s.animateHtml(testName, heading, sections);
	});

	casper.run();

});