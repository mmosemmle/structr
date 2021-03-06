/**
 * Copyright (C) 2010-2017 Structr GmbH
 *
 * This file is part of Structr <http://structr.org>.
 *
 * Structr is free software: you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as
 * published by the Free Software Foundation, either version 3 of the
 * License, or (at your option) any later version.
 *
 * Structr is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU General Public License for more details.
 *
 * You should have received a copy of the GNU General Public License
 * along with Structr.  If not, see <http://www.gnu.org/licenses/>.
 */
package org.structr.core.graph;


import java.util.Map;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.structr.bolt.wrapper.NodeWrapper;
import org.structr.bolt.wrapper.RelationshipWrapper;
import org.structr.common.AccessPathCache;
import org.structr.common.error.FrameworkException;
import org.structr.core.app.App;
import org.structr.core.app.StructrApp;

//~--- classes ----------------------------------------------------------------

/**
 * Flushes caches
 *
 *
 */
public class FlushCachesCommand extends NodeServiceCommand implements MaintenanceCommand {

	private static final Logger logger = LoggerFactory.getLogger(FlushCachesCommand.class.getName());

	@Override
	public void execute(Map<String, Object> attributes) throws FrameworkException {

		logger.info("Clearing all caches.");

		NodeWrapper.clearCache();
		RelationshipWrapper.clearCache();
		AccessPathCache.invalidate();

		App app = StructrApp.getInstance(securityContext);

		app.invalidateCache();
		app.getDatabaseService().invalidateQueryCache();

		logger.info("Done");
	}

	@Override
	public boolean requiresEnclosingTransaction() {
		return true;
	}

	@Override
	public boolean requiresFlushingOfCaches() {
		return false;
	}
}
