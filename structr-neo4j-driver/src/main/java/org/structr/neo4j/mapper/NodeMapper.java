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
package org.structr.neo4j.mapper;

import java.util.function.Function;
import org.structr.api.graph.Node;
import org.structr.neo4j.Neo4jDatabaseService;
import org.structr.neo4j.wrapper.NodeWrapper;

/**
 *
 */
public class NodeMapper extends EntityMapper implements Function<org.neo4j.graphdb.Node, Node> {

	public NodeMapper(final Neo4jDatabaseService graphDb) {
		super(graphDb);
	}

	@Override
	public Node apply(org.neo4j.graphdb.Node t) {
		return NodeWrapper.getWrapper(graphDb, t);
	}
}
