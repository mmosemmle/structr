/**
 * Copyright (C) 2010-2016 Structr GmbH
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
package org.structr.core.entity;

import java.util.Arrays;
import java.util.HashSet;
import java.util.Set;
import org.apache.commons.lang3.StringUtils;
import org.structr.common.SecurityContext;
import org.structr.common.error.ErrorBuffer;
import org.structr.common.error.FrameworkException;
import org.structr.common.error.SemanticErrorToken;
import org.structr.core.graph.ModificationQueue;
import static org.structr.core.graph.NodeInterface.name;
import org.structr.core.graph.TransactionCommand;
import org.structr.schema.ReloadSchema;
import org.structr.schema.SchemaHelper;

/**
 *
 *
 */
public abstract class SchemaReloadingNode extends AbstractNode {

	private static final Set<String> ReservedWords = new HashSet<>(Arrays.asList(new String[] {

		"abstract", "continue", "for", "new", "switch", "assert", "default","goto",
		"package", "synchronize", "boolean", "do", "if", "private", "this", "break",
		"double", "implements", "protected", "throw", "byte", "else", "import",
		"public", "throw", "case", "enum", "instanceof", "return", "transient",
		"catch", "extends", "int", "short", "try", "char", "final", "interface",
		"static", "void", "class", "finally", "long", "strictfp", "volatile",
		"const", "float", "native", "super", "while"
	}));

	@Override
	public boolean onCreation(SecurityContext securityContext, ErrorBuffer errorBuffer) throws FrameworkException {

		if (checkName(errorBuffer) && super.onCreation(securityContext, errorBuffer)) {

			// register transaction post processing that recreates the schema information
			TransactionCommand.postProcess("reloadSchema", new ReloadSchema());

			return true;
		}

		return false;
	}

	@Override
	public boolean onModification(SecurityContext securityContext, ErrorBuffer errorBuffer, final ModificationQueue modificationQueue) throws FrameworkException {

		if (checkName(errorBuffer) && super.onModification(securityContext, errorBuffer, modificationQueue)) {

			// register transaction post processing that recreates the schema information
			TransactionCommand.postProcess("reloadSchema", new ReloadSchema());

			return true;
		}

		return false;
	}

	@Override
	public void onNodeDeletion() {

		final String signature = getResourceSignature();
		if (StringUtils.isNotBlank(signature)) {

			SchemaHelper.removeDynamicGrants(getResourceSignature());
		}

		// register transaction post processing that recreates the schema information
		TransactionCommand.postProcess("reloadSchema", new ReloadSchema());

	}

	public String getResourceSignature() {
		return getProperty(name);
	}

	public String getClassName() {
		return getProperty(name);
	}

	public String getSuperclassName() {

		final String superclassName = getProperty(SchemaNode.extendsClass);
		if (superclassName == null) {

			return AbstractNode.class.getSimpleName();
		}

		return superclassName.substring(superclassName.lastIndexOf(".")+1);
	}

	// ----- private methods -----
	protected boolean checkName(final ErrorBuffer errorBuffer) throws FrameworkException {

		// since we're creating Java code, we need to make sure that no
		// reserved words or existing class names are overwritten
		final String _name = getProperty(AbstractNode.name);
		if (_name != null) {

			if (ReservedWords.contains(_name)) {

				errorBuffer.add(new SemanticErrorToken(_name, AbstractNode.name, "name_is_reserved"));
				return false;
			}

			try {

				Class.forName("org.structr.web.entity.html." + _name);

				// if the above calls do NOT fail, the class already exists => error
				errorBuffer.add(new SemanticErrorToken(_name, AbstractNode.name, "type_already_exists"));
				return false;

			} catch (ClassNotFoundException ignore) {}

			try {

				Class.forName("org.structr.dynamic." + _name);

				// if the above calls do NOT fail, the class already exists => error
				errorBuffer.add(new SemanticErrorToken(_name, AbstractNode.name, "type_already_exists"));
				return false;

			} catch (ClassNotFoundException ignore) {}
		}

		return true;
	}
}