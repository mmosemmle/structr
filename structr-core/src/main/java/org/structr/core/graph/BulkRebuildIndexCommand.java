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

import java.util.Collections;
import java.util.Iterator;
import java.util.Map;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.structr.api.DatabaseService;
import org.structr.api.util.Iterables;
import org.structr.common.SecurityContext;
import org.structr.common.StructrAndSpatialPredicate;
import org.structr.common.error.ErrorBuffer;
import org.structr.common.error.FrameworkException;
import org.structr.core.app.StructrApp;
import org.structr.core.entity.AbstractNode;
import org.structr.core.entity.AbstractRelationship;

//~--- classes ----------------------------------------------------------------
/**
 * Rebuild index for nodes or relationships of given type.
 *
 * Use 'type' argument for node type, and 'relType' for relationship type.
 *
 *
 */
public class BulkRebuildIndexCommand extends NodeServiceCommand implements MaintenanceCommand, TransactionPostProcess {

	private static final Logger logger = LoggerFactory.getLogger(BulkRebuildIndexCommand.class.getName());

	//~--- methods --------------------------------------------------------
	@Override
	public void execute(Map<String, Object> attributes) {

		final String mode       = (String) attributes.get("mode");
		final String entityType = (String) attributes.get("type");
		final String relType    = (String) attributes.get("relType");

		if (mode == null || "nodesOnly".equals(mode)) {
			rebuildNodeIndex(entityType);
		}

		if (mode == null || "relsOnly".equals(mode)) {
			rebuildRelationshipIndex(relType);
		}
	}

	// ----- interface TransactionPostProcess -----
	@Override
	public boolean execute(SecurityContext securityContext, ErrorBuffer errorBuffer) throws FrameworkException {

		execute(Collections.EMPTY_MAP);

		return true;
	}

	@Override
	public boolean requiresEnclosingTransaction() {
		return false;
	}

	@Override
	public boolean requiresFlushingOfCaches() {
		return false;
	}

	// ----- private methods -----
	private void rebuildNodeIndex(final String entityType) {

		final NodeFactory nodeFactory       = new NodeFactory(SecurityContext.getSuperUserInstance());
		final DatabaseService graphDb       = (DatabaseService) arguments.get("graphDb");
		Iterator<AbstractNode> nodeIterator = null;

		try (final Tx tx = StructrApp.getInstance().tx()) {

			nodeIterator = Iterables.filter(new TypePredicate<>(entityType), Iterables.map(nodeFactory, Iterables.filter(new StructrAndSpatialPredicate(true, false, false), graphDb.getAllNodes()))).iterator();
			tx.success();

		} catch (FrameworkException fex) {
			logger.warn("Exception while creating all nodes iterator.", fex);
		}

		if (entityType == null) {

			info("Node type not set or no entity class found. Starting (re-)indexing all nodes");

		} else {

			info("Starting (re-)indexing all nodes of type {}", entityType);
		}

		long count = bulkGraphOperation(securityContext, nodeIterator, 1000, "RebuildNodeIndex", new BulkGraphOperation<AbstractNode>() {

			@Override
			public void handleGraphObject(SecurityContext securityContext, AbstractNode node) {
				node.updateInIndex();
			}

			@Override
			public void handleThrowable(SecurityContext securityContext, Throwable t, AbstractNode node) {
				logger.warn("Unable to index node {}: {}", new Object[]{node, t.getMessage()});
			}

			@Override
			public void handleTransactionFailure(SecurityContext securityContext, Throwable t) {
				logger.warn("Unable to index node: {}", t.getMessage());
			}
		});

		info("Done with (re-)indexing {} nodes", count);
	}

	private void rebuildRelationshipIndex(final String relType) {

		final RelationshipFactory relFactory = new RelationshipFactory(SecurityContext.getSuperUserInstance());
		final DatabaseService graphDb        = (DatabaseService) arguments.get("graphDb");

		Iterator<AbstractRelationship> relIterator = null;


		try (final Tx tx = StructrApp.getInstance().tx()) {

			relIterator = Iterables.filter(new TypePredicate<>(relType), Iterables.map(relFactory,Iterables.filter(new StructrAndSpatialPredicate(true, false, false), graphDb.getAllRelationships()))).iterator();
			tx.success();

		} catch (FrameworkException fex) {
			logger.warn("Exception while creating all relationships iterator.", fex);
		}

		if (relType == null) {

			info("Relationship type not set, starting (re-)indexing all relationships");

		} else {

			info("Starting (re-)indexing all relationships of type {}", new Object[]{relType});

		}

		long count = bulkGraphOperation(securityContext, relIterator, 1000, "RebuildRelIndex", new BulkGraphOperation<AbstractRelationship>() {

			@Override
			public void handleGraphObject(SecurityContext securityContext, AbstractRelationship rel) {
				rel.updateInIndex();
			}

			@Override
			public void handleThrowable(SecurityContext securityContext, Throwable t, AbstractRelationship rel) {
				logger.warn("Unable to index relationship {}: {}", new Object[]{rel, t.getMessage()});
			}

			@Override
			public void handleTransactionFailure(SecurityContext securityContext, Throwable t) {
				logger.warn("Unable to index relationship: {}", t.getMessage());
			}
		});

		info("Done with (re-)indexing {} relationships", count);
	}
}
